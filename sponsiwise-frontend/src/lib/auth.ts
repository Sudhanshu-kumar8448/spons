import { cookies } from "next/headers";
import type { AuthUser } from "@/lib/types/roles";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Get the API base URL for server-side requests
 */
function getApiBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not defined");
  }
  return API_BASE_URL;
}

/**
 * Server-side only.
 *
 * Calls GET /auth/me by forwarding the browser's cookies (httpOnly JWT).
 * Returns the authenticated user or `null` when not logged in / backend
 * is unreachable.
 *
 * ⚠️  Must be called from a Server Component or Server Action — never
 *     from a Client Component.
 */
export async function getServerUser(): Promise<AuthUser | null> {
  try {
    const baseUrl = getApiBaseUrl();
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    // Debug logging
    console.log("[getServerUser] Cookies found:", cookieStore.getAll().map(c => c.name));
    console.log("[getServerUser] Cookie header:", cookieHeader);

    const res = await fetch(`${baseUrl}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      // Don't cache user identity between requests
      cache: "no-store",
    });

    if (!res.ok) {
      console.log("[getServerUser] Response not OK:", res.status, res.statusText);
      return null;
    }

    const user: AuthUser = await res.json();
    console.log("[getServerUser] User authenticated:", user);
    return user;
  } catch (error) {
    console.error("[getServerUser] Error:", error);
    return null;
  }
}
