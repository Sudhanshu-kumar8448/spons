import { authFetch } from "@/lib/auth-fetch";
import type {
  ManagerDashboardStats,
  ManagerEventDetail,
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
): Promise<ManagerEventDetail> {
  return authFetch<ManagerEventDetail>(`/manager/events/${id}`);
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

// ─── Proposals ────────────────────────────────────────────────────────

export async function fetchManagerProposals(params?: {
  page?: number;
  page_size?: number;
  status?: string;
  search?: string;
}): Promise<any> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.status) qs.set("status", params.status);
  if (params?.search) qs.set("search", params.search);

  const query = qs.toString();
  return authFetch<any>(`/manager/proposals${query ? `?${query}` : ""}`);
}

export async function fetchManagerProposalById(id: string): Promise<any> {
  return authFetch<any>(`/manager/proposals/${id}`);
}