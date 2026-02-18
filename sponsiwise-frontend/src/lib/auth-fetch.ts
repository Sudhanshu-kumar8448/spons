import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * ApiError — typed error for non-OK HTTP responses.
 */
export class ApiError extends Error {
    constructor(
        public status: number,
        public statusText: string,
        public detail?: string,
    ) {
        super(detail || statusText);
        this.name = "ApiError";
    }
}

/**
 * Server-side authenticated fetch with automatic 401 refresh retry.
 *
 * Flow:
 *  1. Forward browser cookies to the backend.
 *  2. If backend returns 401, call POST /auth/refresh to rotate tokens.
 *  3. Retry the original request exactly once with the new cookie header.
 *  4. If refresh also fails, redirect to /login.
 *
 * ⚠️  Must only be called from Server Components / Server Actions.
 *     Importing `next/headers` makes this server-only.
 */
export async function authFetch<T>(
    endpoint: string,
    init?: RequestInit & { revalidate?: number | false },
): Promise<T> {
    if (!API_BASE_URL) {
        throw new Error("NEXT_PUBLIC_API_BASE_URL is not defined");
    }

    const cookieStore = await cookies();
    const cookieHeader = cookieStore
        .getAll()
        .map((c) => `${c.name}=${c.value}`)
        .join("; ");

    const { revalidate, ...rest } = init ?? {};

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
            "Content-Type": "application/json",
            Cookie: cookieHeader,
            ...(init?.headers as Record<string, string>),
        },
        cache: init?.cache ?? (revalidate ? undefined : "no-store"),
        next: revalidate ? { revalidate } : undefined,
        ...rest,
    });

    // ── Happy path ──────────────────────────────────────────
    if (res.ok) {
        if (res.status === 204) return undefined as T;
        return res.json();
    }

    // ── 401 → attempt token refresh once ────────────────────
    if (res.status === 401) {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: cookieHeader,
            },
            cache: "no-store",
        });

        if (!refreshRes.ok) {
            // Refresh failed — session expired, redirect to login
            redirect("/login");
        }

        // Extract the new Set-Cookie value from the refresh response
        // so we can forward it in the retry request
        const newCookies = refreshRes.headers.getSetCookie?.() ?? [];
        const updatedCookieHeader = newCookies.length > 0
            ? [...cookieHeader.split("; "), ...newCookies.map((c) => c.split(";")[0])].join("; ")
            : cookieHeader;

        // Retry the original request with fresh auth
        const retryRes = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                "Content-Type": "application/json",
                Cookie: updatedCookieHeader,
                ...(init?.headers as Record<string, string>),
            },
            cache: "no-store",
            ...rest,
        });

        if (retryRes.ok) {
            if (retryRes.status === 204) return undefined as T;
            return retryRes.json();
        }

        // Retry also failed — extract error and throw
        let detail: string | undefined;
        try {
            const body = await retryRes.json();
            detail = body.message || body.error;
        } catch {
            /* non-JSON */
        }
        throw new ApiError(retryRes.status, retryRes.statusText, detail);
    }

    // ── Other errors → throw ApiError ───────────────────────
    let message: string | undefined;
    try {
        const body = await res.json();
        message = body.message || body.error;
    } catch {
        /* non-JSON */
    }
    throw new ApiError(res.status, res.statusText, message);
}
