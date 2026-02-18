import { ApiError } from "@/lib/api-client";

/**
 * Normalise any caught error into a user-friendly message string.
 *
 * Safe to use in both Server Components and Server Actions.
 * Contains ZERO business logic — just error shape normalisation.
 *
 * @example
 * ```ts
 * try {
 *   const data = await fetchSomething();
 * } catch (err) {
 *   const message = normalizeError(err);
 *   // → "Not Found" | "Something went wrong."
 * }
 * ```
 */
export function normalizeError(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  return fallback;
}

/**
 * Type guard for the NEXT_REDIRECT error thrown by `redirect()`.
 * Use in Server Action catch blocks to re-throw the redirect.
 *
 * @example
 * ```ts
 * try {
 *   await doMutation();
 *   redirect("/somewhere");
 * } catch (err) {
 *   if (isRedirectError(err)) throw err;
 *   return { success: false, error: normalizeError(err) };
 * }
 * ```
 */
export function isRedirectError(err: unknown): boolean {
  return err instanceof Error && err.message === "NEXT_REDIRECT";
}
