import { cookies } from "next/headers";
import type { AuthUser } from "@/lib/types/roles";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

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
  if (!API_BASE_URL) {
    return null;
  }

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      // Don't cache user identity between requests
      cache: "no-store",
    });

    if (!res.ok) return null;

    const user: AuthUser = await res.json();
    return user;
  } catch {
    return null;
  }
}
