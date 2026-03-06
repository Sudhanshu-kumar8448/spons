"server-only";
import { cookies } from "next/headers";
import { AuthError, HttpError } from "./errors/fetch-errors";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Get the API base URL
 */
function getApiBaseUrl(): string {
    if (!API_BASE_URL) {
        throw new Error("NEXT_PUBLIC_API_BASE_URL is not defined");
    }
    return API_BASE_URL;
}

/**
 * Parse a Set-Cookie header value and extract cookie properties
 */
function parseSetCookieHeader(setCookieValue: string): {
    name: string;
    value: string;
    options: {
        path?: string;
        httpOnly?: boolean;
        sameSite?: string;
        secure?: boolean;
        maxAge?: number;
    };
} {
    // Split by semicolon to get cookie name=value and options
    const parts = setCookieValue.split(";").map(s => s.trim());
    const [nameValue, ...optionParts] = parts;
    const [name, ...valueParts] = nameValue.split("=");
    const value = valueParts.join("=");

    // Parse options
    const options: { path?: string; httpOnly?: boolean; sameSite?: string; secure?: boolean; maxAge?: number } = {};
    
    for (const option of optionParts) {
        const [key, val] = option.split("=").map(s => s.trim().toLowerCase());
        
        switch (key) {
            case "path":
                options.path = val;
                break;
            case "httponly":
                options.httpOnly = true;
                break;
            case "samesite":
                options.sameSite = val;
                break;
            case "secure":
                options.secure = true;
                break;
            case "max-age":
                options.maxAge = parseInt(val, 10);
                break;
        }
    }

    return { name, value, options };
}

/**
 * Write Set-Cookie headers to the Next.js cookie store
 */
async function writeCookiesToStore(setCookieHeaders: string[]): Promise<void> {
    const cookieStore = await cookies();
    
    for (const setCookieValue of setCookieHeaders) {
        try {
            const { name, value, options } = parseSetCookieHeader(setCookieValue);
            
            cookieStore.set(name, value, {
                path: options.path || "/",
                httpOnly: options.httpOnly ?? true,
                sameSite: options.sameSite as "lax" | "strict" | "none" | undefined,
                secure: options.secure ?? process.env.NODE_ENV === "production",
                maxAge: options.maxAge,
            });
            
            console.log(`[authFetch] Cookie written to store: ${name}`);
        } catch (err) {
            console.error(`[authFetch] Failed to write cookie:`, err);
        }
    }
}

/**
 * Server-side authenticated fetch with automatic 401 refresh retry.
 * 
 * Flow:
 *  1. Forward cookies to the backend.
 *  2. If backend returns 401, call POST /auth/refresh to rotate tokens.
 *  3. Write new cookies to Next.js cookie store using cookies().set()
 *  4. Retry the original request with fresh cookies from the store.
 *  5. If refresh fails, throw AuthError (caller must handle redirect).
 *
 * ⚠️  Must only be called from Server Components / Server Actions.
 *
 * @throws {AuthError} When session is expired and refresh failed
 * @throws {HttpError} For other HTTP errors
 */
export async function authFetch<T>(
    endpoint: string,
    init?: RequestInit & { revalidate?: number | false },
): Promise<T> {
    const baseUrl = getApiBaseUrl();
    
    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const cookieStore = await cookies();
    const cookieHeader = cookieStore
        .getAll()
        .map((c) => `${c.name}=${c.value}`)
        .join("; ");

    // Debug logging
    console.log(`[authFetch] Endpoint: ${normalizedEndpoint}`);
    console.log(`[authFetch] Cookies found:`, cookieStore.getAll().map(c => c.name));

    const { revalidate, headers: initHeaders, ...rest } = init ?? {};

    const res = await fetch(`${baseUrl}${normalizedEndpoint}`, {
        ...rest,
        headers: {
            "Content-Type": "application/json",
            Cookie: cookieHeader,
            ...(initHeaders as Record<string, string> | undefined),
        },
        cache: init?.cache ?? (revalidate ? undefined : "no-store"),
        next: revalidate ? { revalidate } : undefined,
    });

    // ── Happy path ──────────────────────────────────────────
    if (res.ok) {
        if (res.status === 204) return undefined as T;
        return res.json();
    }

    // ── 401 → attempt token refresh once ────────────────────
    if (res.status === 401) {
        console.log(`[authFetch] Got 401, attempting refresh...`);
        
        const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: cookieHeader,
            },
            cache: "no-store",
        });

        if (!refreshRes.ok) {
            // Refresh failed — session expired, throw AuthError
            console.log(`[authFetch] Refresh failed with status ${refreshRes.status}, throwing AuthError`);
            throw new AuthError("Session expired. Please log in again.");
        }

        console.log(`[authFetch] Refresh successful, writing cookies to store`);

        // Extract Set-Cookie headers from refresh response
        const setCookieHeaders = refreshRes.headers.getSetCookie?.() ?? [];
        
        if (setCookieHeaders.length > 0) {
            // Write new cookies to Next.js cookie store
            await writeCookiesToStore(setCookieHeaders);
        }

        // Get fresh cookies from the store for retry
        const updatedCookieStore = await cookies();
        const updatedCookieHeader = updatedCookieStore
            .getAll()
            .map((c) => `${c.name}=${c.value}`)
            .join("; ");

        console.log(`[authFetch] Retrying with updated cookies:`, updatedCookieStore.getAll().map(c => c.name));

        // Retry the original request with fresh cookies
        const retryRes = await fetch(`${baseUrl}${normalizedEndpoint}`, {
            ...rest,
            headers: {
                "Content-Type": "application/json",
                Cookie: updatedCookieHeader,
                ...(initHeaders as Record<string, string> | undefined),
            },
            cache: "no-store",
        });

        if (retryRes.ok) {
            if (retryRes.status === 204) return undefined as T;
            return retryRes.json();
        }

        // Retry also failed with 401 - session still invalid
        if (retryRes.status === 401) {
            throw new AuthError("Session expired. Please log in again.");
        }

        // Retry failed with other error - extract error and throw HttpError
        let detail: string | undefined;
        let code: string | undefined;
        try {
            const body = await retryRes.json();
            detail = body.message || body.error;
            code = body.code;
        } catch {
            /* non-JSON */
        }
        throw new HttpError(retryRes.status, retryRes.statusText, detail, code);
    }

    // ── Other errors → throw HttpError ───────────────────────
    let message: string | undefined;
    let code: string | undefined;
    try {
        const body = await res.json();
        message = body.message || body.error;
        code = body.code;
    } catch {
        /* non-JSON */
    }
    throw new HttpError(res.status, res.statusText, message, code);
}
