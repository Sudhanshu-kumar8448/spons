import { authFetch } from "@/lib/auth-fetch";
import type {
  ActivityLogResponse,
  CompanyLifecycleResponse,
  EventLifecycleResponse,
  ManagerDashboardStats,
  VerifiableCompaniesResponse,
  VerifiableCompany,
  VerifiableEvent,
  VerifiableEventsResponse,
  VerificationPayload,
} from "@/lib/types/manager";

// ─── Dashboard stats ───────────────────────────────────────────────────

export async function fetchManagerDashboardStats(): Promise<ManagerDashboardStats> {
  return authFetch<ManagerDashboardStats>("/manager/dashboard/stats");
}

// ─── Companies ─────────────────────────────────────────────────────────

export async function fetchVerifiableCompanies(params?: {
  page?: number;
  page_size?: number;
  verification_status?: string;
  search?: string;
}): Promise<VerifiableCompaniesResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.verification_status)
    qs.set("verification_status", params.verification_status);
  if (params?.search) qs.set("search", params.search);

  const query = qs.toString();
  return authFetch<VerifiableCompaniesResponse>(
    `/manager/companies${query ? `?${query}` : ""}`,
  );
}

export async function fetchVerifiableCompanyById(
  id: string,
): Promise<VerifiableCompany> {
  return authFetch<VerifiableCompany>(`/manager/companies/${id}`);
}

export async function verifyCompany(
  id: string,
  payload: VerificationPayload,
): Promise<VerifiableCompany> {
  return authFetch<VerifiableCompany>(`/manager/companies/${id}/verify`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Events ────────────────────────────────────────────────────────────

export async function fetchVerifiableEvents(params?: {
  page?: number;
  page_size?: number;
  verification_status?: string;
  search?: string;
}): Promise<VerifiableEventsResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.verification_status)
    qs.set("verification_status", params.verification_status);
  if (params?.search) qs.set("search", params.search);

  const query = qs.toString();
  return authFetch<VerifiableEventsResponse>(
    `/manager/events${query ? `?${query}` : ""}`,
  );
}

export async function fetchVerifiableEventById(
  id: string,
): Promise<VerifiableEvent> {
  return authFetch<VerifiableEvent>(`/manager/events/${id}`);
}

export async function verifyEvent(
  id: string,
  payload: VerificationPayload,
): Promise<VerifiableEvent> {
  return authFetch<VerifiableEvent>(`/manager/events/${id}/verify`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Activity log ──────────────────────────────────────────────────────

export async function fetchActivityLog(params?: {
  page?: number;
  page_size?: number;
  type?: string;
}): Promise<ActivityLogResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.type) qs.set("type", params.type);

  const query = qs.toString();
  return authFetch<ActivityLogResponse>(
    `/manager/activity${query ? `?${query}` : ""}`,
  );
}

// ─── Lifecycle ─────────────────────────────────────────────────────────

export async function fetchEventLifecycle(
  id: string,
): Promise<EventLifecycleResponse> {
  return authFetch<EventLifecycleResponse>(
    `/manager/events/${id}/lifecycle`,
  );
}

export async function fetchCompanyLifecycleView(
  id: string,
): Promise<CompanyLifecycleResponse> {
  return authFetch<CompanyLifecycleResponse>(
    `/manager/companies/${id}/lifecycle`,
  );
}



