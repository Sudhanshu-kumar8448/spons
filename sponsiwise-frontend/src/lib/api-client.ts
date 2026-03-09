const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Get the API base URL.
 * - Development (browser): uses /api proxy to avoid CORS issues
 * - Production (browser): uses NEXT_PUBLIC_API_BASE_URL directly (e.g. https://api.sponsiwise.app)
 * - Server-side: always uses NEXT_PUBLIC_API_BASE_URL
 */
function getBaseUrl(): string {
    if (typeof window !== 'undefined') {
        // In production, call the API backend directly
        if (process.env.NODE_ENV === 'production' && API_BASE_URL) {
            return API_BASE_URL;
        }
        // In development, use the Next.js rewrite proxy
        return '/api';
    }
    
    // Server-side: use the full URL from env
    if (!API_BASE_URL) {
        throw new Error("NEXT_PUBLIC_API_BASE_URL is not defined");
    }
    return API_BASE_URL;
}

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
 * Valid HTTP methods.
 */
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Generic fetch wrapper for client-side API calls.
 */
async function clientFetch<T>(
    endpoint: string,
    method: HttpMethod,
    body?: unknown,
    options?: RequestInit,
): Promise<T> {
    const baseUrl = getBaseUrl();
    
    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
    };

    const config: RequestInit = {
        method,
        headers,
        ...options,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    // Include credentials (cookies) in client-side requests
    config.credentials = "include";

    const res = await fetch(`${baseUrl}${normalizedEndpoint}`, config);

    if (!res.ok) {
        let detail: string | undefined;
        try {
            const data = await res.json();
            const msg = data.message || data.error;
            if (Array.isArray(msg)) {
                detail = msg.join('. ');
            } else {
                detail = msg;
            }
        } catch {
            // ignore non-json error
        }
        throw new ApiError(res.status, res.statusText, detail);
    }

    // Handle 204 No Content
    if (res.status === 204) {
        return undefined as unknown as T;
    }

    return res.json();
}

/**
 * Check if the error is an instance of ApiError.
 */
export function isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
}

/**
 * Exported API Client object.
 */
export const apiClient = {
    get: <T>(endpoint: string, options?: RequestInit) =>
        clientFetch<T>(endpoint, "GET", undefined, options),

    post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
        clientFetch<T>(endpoint, "POST", body, options),

    put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
        clientFetch<T>(endpoint, "PUT", body, options),

    patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
        clientFetch<T>(endpoint, "PATCH", body, options),

    delete: <T>(endpoint: string, options?: RequestInit) =>
        clientFetch<T>(endpoint, "DELETE", undefined, options),
};

