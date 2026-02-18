import { authFetch } from "@/lib/auth-fetch";
import type { AuditLogEntry, AuditLogsResponse } from "@/lib/types/audit";

// ─── Audit Logs API ────────────────────────────────────────────────────

/**
 * Fetch paginated audit logs for the current tenant.
 *
 * The backend is role-aware:
 *   - USER / SPONSOR / ORGANIZER → own actions only
 *   - MANAGER / ADMIN → tenant-wide activity
 */
export async function fetchAuditLogs(params?: {
  page?: number;
  pageSize?: number;
  entityType?: string;
  action?: string;
}): Promise<AuditLogsResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params?.entityType) qs.set("entityType", params.entityType);
  if (params?.action) qs.set("action", params.action);

  const query = qs.toString();
  return authFetch<AuditLogsResponse>(
    `/audit-logs${query ? `?${query}` : ""}`,
  );
}

/**
 * Fetch audit history for a specific entity.
 * Useful for showing "History" on a detail page.
 */
export async function fetchEntityHistory(
  entityType: string,
  entityId: string,
): Promise<AuditLogEntry[]> {
  return authFetch<AuditLogEntry[]>(
    `/audit-logs/entity/${entityType}/${entityId}`,
  );
}
