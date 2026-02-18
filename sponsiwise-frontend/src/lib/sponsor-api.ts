import { authFetch } from "@/lib/auth-fetch";
import type {
  BrowsableEvent,
  BrowsableEventsResponse,
  CreateProposalPayload,
  Proposal,
  ProposalsResponse,
  SponsorDashboardStats,
  SponsorshipsResponse,
} from "@/lib/types/sponsor";


// ─── Dashboard stats ───────────────────────────────────────────────────

export async function fetchSponsorDashboardStats(): Promise<SponsorDashboardStats> {
  return authFetch<SponsorDashboardStats>("/sponsor/dashboard/stats");
}

// ─── Proposals ─────────────────────────────────────────────────────────

export async function fetchSponsorProposals(params?: {
  page?: number;
  page_size?: number;
  status?: string;
}): Promise<ProposalsResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.status) qs.set("status", params.status);

  const query = qs.toString();
  return authFetch<ProposalsResponse>(
    `/sponsor/proposals${query ? `?${query}` : ""}`,
  );
}

export async function fetchSponsorProposalById(id: string): Promise<Proposal> {
  return authFetch<Proposal>(`/sponsor/proposals/${id}`);
}

export async function createProposal(
  payload: CreateProposalPayload,
): Promise<Proposal> {
  return authFetch<Proposal>("/sponsor/proposals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function withdrawProposal(id: string): Promise<Proposal> {
  return authFetch<Proposal>(`/sponsor/proposals/${id}/withdraw`, {
    method: "POST",
  });
}

// ─── Browsable events ──────────────────────────────────────────────────

export async function fetchBrowsableEvents(params?: {
  page?: number;
  page_size?: number;
  category?: string;
  search?: string;
}): Promise<BrowsableEventsResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.category) qs.set("category", params.category);
  if (params?.search) qs.set("search", params.search);

  const query = qs.toString();
  return authFetch<BrowsableEventsResponse>(
    `/sponsor/events${query ? `?${query}` : ""}`,
  );
}

export async function fetchBrowsableEventById(
  id: string,
): Promise<BrowsableEvent> {
  return authFetch<BrowsableEvent>(`/sponsor/events/${id}`);
}

// ─── Sponsorships ──────────────────────────────────────────────────────

export async function fetchSponsorSponsorships(params?: {
  page?: number;
  page_size?: number;
}): Promise<SponsorshipsResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));

  const query = qs.toString();
  return authFetch<SponsorshipsResponse>(
    `/sponsor/sponsorships${query ? `?${query}` : ""}`,
  );
}
