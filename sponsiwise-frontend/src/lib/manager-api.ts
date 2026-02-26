import { authFetch } from "@/lib/auth-fetch";
import type {
  ActivityLogResponse,
  CompanyLifecycleResponse,
  EventLifecycleResponse,
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
): Promise<ManagerEventDetail> {
  return authFetch<ManagerEventDetail>(`/manager/events/${id}`);
}

export async function updateEvent(
  id: string,
  payload: any,
): Promise<ManagerEventDetail> {
  return authFetch<ManagerEventDetail>(`/manager/events/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
  });
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

// ─── Tier Management ───────────────────────────────────────────────────

export interface CreateTierPayload {
  tierType: string;
  askingPrice: number;
  totalSlots?: number;
}

export interface UpdateTierPayload {
  askingPrice?: number;
  totalSlots?: number;
  isLocked?: boolean;
}

export async function createEventTier(
  eventId: string,
  payload: CreateTierPayload,
): Promise<any> {
  return authFetch(`/manager/events/${eventId}/tiers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEventTier(
  eventId: string,
  tierId: string,
  payload: UpdateTierPayload,
): Promise<{ error: string }> {
  return authFetch<{ error: string }>(
    `/manager/events/${eventId}/tiers/${tierId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
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

export async function updateManagerProposal(
  id: string,
  payload: any,
): Promise<any> {
  return authFetch<any>(`/manager/proposals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

// ─── Activity Log ──────────────────────────────────────────────────────

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



