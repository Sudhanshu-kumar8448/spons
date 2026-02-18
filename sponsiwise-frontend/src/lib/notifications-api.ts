import { authFetch } from "@/lib/auth-fetch";
import type {
  Notification,
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

/**
 * Fetch a single notification by ID.
 */
export async function fetchNotificationById(
  id: string,
): Promise<Notification> {
  return authFetch<Notification>(`/notifications/${id}`);
}

/**
 * Mark a single notification as read.
 * Backend: PATCH /notifications/:id/read
 */
export async function markNotificationRead(
  id: string,
): Promise<Notification> {
  return authFetch<Notification>(`/notifications/${id}/read`, {
    method: "PATCH",
  });
}

/**
 * Mark all notifications as read for the current user.
 * Calls mark-read on each notification.
 * Returns the number of notifications marked.
 */
export async function markAllNotificationsRead(): Promise<void> {
  await authFetch("/notifications/read-all", {
    method: "PATCH",
  });
}
