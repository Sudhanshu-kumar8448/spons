import { authFetch } from "@/lib/auth-fetch";
import type {
  AdminDashboardStats,
  RoleUpdatePayload,
  StatusUpdatePayload,
  TenantUserDetail,
  TenantUsersResponse,
} from "@/lib/types/admin";

// ─── Dashboard stats ───────────────────────────────────────────────────

export function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  return authFetch<AdminDashboardStats>("/admin/dashboard/stats");
}

// ─── Users ─────────────────────────────────────────────────────────────

export function fetchTenantUsers(params?: {
  page?: number;
  page_size?: number;
  role?: string;
  status?: string;
  search?: string;
}): Promise<TenantUsersResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.role) qs.set("role", params.role);
  if (params?.status) qs.set("status", params.status);
  if (params?.search) qs.set("search", params.search);

  const query = qs.toString();
  return authFetch<TenantUsersResponse>(
    `/admin/users${query ? `?${query}` : ""}`,
  );
}

export function fetchTenantUserById(id: string): Promise<TenantUserDetail> {
  return authFetch<TenantUserDetail>(`/admin/users/${id}`);
}

export function updateUserRole(
  userId: string,
  payload: RoleUpdatePayload,
): Promise<TenantUserDetail> {
  return authFetch<TenantUserDetail>(`/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateUserStatus(
  userId: string,
  payload: StatusUpdatePayload,
): Promise<TenantUserDetail> {
  return authFetch<TenantUserDetail>(`/admin/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
