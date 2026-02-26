/**
 * Custom error classes for the auth-fetch module.
 * 
 * These errors are designed to be safe for use in both
 * Server Actions and Client Components without serialization issues.
 */

/**
 * Error thrown when authentication has expired and refresh failed.
 * Caller should redirect to login page.
 */
export class AuthError extends Error {
    readonly code: "AUTH_EXPIRED" = "AUTH_EXPIRED";
    readonly status: number = 401;

    constructor(message = "Session expired. Please log in again.") {
        super(message);
        this.name = "AuthError";
        // Maintains proper stack trace in V8 environments
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AuthError);
        }
    }

    /**
     * Check if an error is an AuthError
     */
    static isAuthError(error: unknown): error is AuthError {
        return error instanceof AuthError;
    }
}

/**
 * Error thrown for HTTP errors that aren't authentication-related.
 */
export class HttpError extends Error {
    readonly status: number;
    readonly statusText: string;
    readonly code?: string;

    constructor(
        status: number,
        statusText: string,
        message?: string,
        code?: string
    ) {
        super(message || statusText);
        this.name = "HttpError";
        this.status = status;
        this.statusText = statusText;
        this.code = code;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, HttpError);
        }
    }

    /**
     * Check if an error is an HttpError
     */
    static isHttpError(error: unknown): error is HttpError {
        return error instanceof HttpError;
    }

    /**
     * Check if error is a 401 Unauthorized
     */
    isUnauthorized(): boolean {
        return this.status === 401;
    }

    /**
     * Check if error is a 403 Forbidden
     */
    isForbidden(): boolean {
        return this.status === 403;
    }

    /**
     * Check if error is a 404 Not Found
     */
    isNotFound(): boolean {
        return this.status === 404;
    }

    /**
     * Check if error is a 5xx Server Error
     */
    isServerError(): boolean {
        return this.status >= 500 && this.status < 600;
    }
}

/**
 * Type guard to check if an error is an authentication-related error
 * (either AuthError or a 401 HttpError)
 */
export function isAuthRelatedError(error: unknown): boolean {
    if (AuthError.isAuthError(error)) return true;
    if (HttpError.isHttpError(error) && error.isUnauthorized()) return true;
    return false;
}

/**
 * Union type for all possible fetch errors
 */
export type FetchError = AuthError | HttpError;

