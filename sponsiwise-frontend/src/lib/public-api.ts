import { ApiError } from "@/lib/api-client";
import type {
  PlatformStats,
  PublicCompany,
  PublicCompaniesResponse,
  PublicEvent,
  PublicEventsResponse,
} from "@/lib/types/public";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Server-side fetch wrapper for PUBLIC (unauthenticated) endpoints.
 *
 * — No cookies / tokens forwarded
 * — Responses are revalidated every 60 s (ISR-friendly)
 * — Throws `ApiError` on non-2xx so callers can catch gracefully
 */
async function publicFetch<T>(
  endpoint: string,
  options?: { revalidate?: number | false },
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    next: {
      revalidate:
        options?.revalidate === false ? 0 : (options?.revalidate ?? 60),
    },
  });

  if (!res.ok) {
    let message: string | undefined;
    try {
      const body = await res.json();
      message = body.message || body.error;
    } catch {
      /* non-JSON body */
    }
    throw new ApiError(res.status, res.statusText, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Events ────────────────────────────────────────────────────────────

export async function fetchPublicEvents(params?: {
  page?: number;
  page_size?: number;
  category?: string;
  search?: string;
}): Promise<PublicEventsResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.category) qs.set("category", params.category);
  if (params?.search) qs.set("search", params.search);

  const query = qs.toString();
  return publicFetch<PublicEventsResponse>(
    `/public/events${query ? `?${query}` : ""}`,
  );
}

export async function fetchPublicEventBySlug(
  slug: string,
): Promise<PublicEvent> {
  return publicFetch<PublicEvent>(`/public/events/${slug}`);
}

// ─── Companies ─────────────────────────────────────────────────────────

export async function fetchPublicCompany(slug: string): Promise<PublicCompany> {
  return publicFetch<PublicCompany>(`/public/companies/${slug}`);
}

// ─── Companies ─────────────────────────────────────────────────────────

export async function fetchPublicCompanies(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  industry?: string;
}): Promise<PublicCompaniesResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.search) qs.set("search", params.search);
  if (params?.industry) qs.set("industry", params.industry);

  const query = qs.toString();
  return publicFetch<PublicCompaniesResponse>(
    `/public/companies${query ? `?${query}` : ""}`,
  );
}

// ─── Platform stats (landing page) ────────────────────────────────────

export async function fetchPlatformStats(): Promise<PlatformStats> {
  return publicFetch<PlatformStats>("/public/stats", { revalidate: 300 });
}
