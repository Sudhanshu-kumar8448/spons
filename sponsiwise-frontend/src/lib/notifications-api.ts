import { authFetch } from "@/lib/auth-fetch";
import type {
  NotificationsResponse,
} from "@/lib/types/notifications";

// ─── Notifications API ─────────────────────────────────────────────────

/**
 * Fetch paginated notifications for the current user.
 * Backend filters by the authenticated user (cookie-based auth).
 */
export async function fetchNotifications(params?: {
  page?: number;
  pageSize?: number;
  read?: boolean;
}): Promise<NotificationsResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params?.read !== undefined) qs.set("read", String(params.read));

  const query = qs.toString();
  return authFetch<NotificationsResponse>(
    `/notifications${query ? `?${query}` : ""}`,
  );
}
