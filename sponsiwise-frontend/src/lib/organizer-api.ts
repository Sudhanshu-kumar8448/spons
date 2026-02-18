import { authFetch } from "@/lib/auth-fetch";
import type {
  IncomingProposal,
  IncomingProposalsResponse,
  OrganizerDashboardStats,
  OrganizerEvent,
  OrganizerEventsResponse,
  ReviewProposalPayload,
  CreateEventPayload,
} from "@/lib/types/organizer";

// ─── Dashboard stats ───────────────────────────────────────────────────

export async function fetchOrganizerDashboardStats(): Promise<OrganizerDashboardStats> {
  return authFetch<OrganizerDashboardStats>("/organizer/dashboard/stats");
}

// ─── Organizer events ──────────────────────────────────────────────────

export async function fetchOrganizerEvents(params?: {
  page?: number;
  page_size?: number;
  status?: string;
  search?: string;
}): Promise<OrganizerEventsResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.status) qs.set("status", params.status);
  if (params?.search) qs.set("search", params.search);

  const query = qs.toString();
  return authFetch<OrganizerEventsResponse>(
    `/organizer/events${query ? `?${query}` : ""}`,
  );
}

export async function fetchOrganizerEventById(
  id: string,
): Promise<OrganizerEvent> {
  return authFetch<OrganizerEvent>(`/organizer/events/${id}`);
}

// ─── Create event ──────────────────────────────────────────────────────

export async function createOrganizerEvent(
  payload: CreateEventPayload,
): Promise<OrganizerEvent> {
  return authFetch<OrganizerEvent>("/organizer/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Incoming proposals ────────────────────────────────────────────────

export async function fetchIncomingProposals(params?: {
  page?: number;
  page_size?: number;
  status?: string;
  event_id?: string;
}): Promise<IncomingProposalsResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.status) qs.set("status", params.status);
  if (params?.event_id) qs.set("event_id", params.event_id);

  const query = qs.toString();
  return authFetch<IncomingProposalsResponse>(
    `/organizer/proposals${query ? `?${query}` : ""}`,
  );
}

export async function fetchIncomingProposalById(
  id: string,
): Promise<IncomingProposal> {
  return authFetch<IncomingProposal>(`/organizer/proposals/${id}`);
}

// ─── Review proposal ───────────────────────────────────────────────────

export async function reviewProposal(
  id: string,
  payload: ReviewProposalPayload,
): Promise<IncomingProposal> {
  return authFetch<IncomingProposal>(`/organizer/proposals/${id}/review`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
