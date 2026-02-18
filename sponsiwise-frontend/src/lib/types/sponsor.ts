// ─── Proposal ──────────────────────────────────────────────────────────

export type ProposalStatus =
    | "draft"
    | "submitted"
    | "under_review"
    | "approved"
    | "rejected"
    | "withdrawn";

export const ProposalStatus = {
    DRAFT: "draft" as ProposalStatus,
    SUBMITTED: "submitted" as ProposalStatus,
    UNDER_REVIEW: "under_review" as ProposalStatus,
    APPROVED: "approved" as ProposalStatus,
    REJECTED: "rejected" as ProposalStatus,
    WITHDRAWN: "withdrawn" as ProposalStatus,
} as const;

export interface Proposal {
    id: string;
    tenantId: string;
    sponsorshipId: string;
    event_id: string;
    status: ProposalStatus;
    title: string;
    description?: string | null;
    proposedTier?: string | null;
    proposedAmount?: number | null;
    amount: number;
    currency: string;
    message?: string | null;
    notes?: string | null;
    reviewer_notes: string | null;
    submittedAt?: string | null;
    submitted_at: string | null;
    reviewedAt?: string | null;
    reviewed_at: string | null;
    isActive: boolean;
    createdAt: string;
    created_at: string;
    updatedAt: string;
    event: {
        id: string;
        title: string;
        location: string | null;
        start_date: string | null;
    };
}

export interface ProposalsResponse {
    data: Proposal[];
    total: number;
    page: number;
    page_size: number;
}

export interface CreateProposalPayload {
    eventId: string;
    proposedTier?: string;
    proposedAmount?: number;
    message?: string;
}

// ─── Browsable Events ──────────────────────────────────────────────────

export interface BrowsableEvent {
    id: string;
    tenantId: string;
    organizerId: string;
    title: string;
    description?: string | null;
    location?: string | null;
    venue?: string | null;
    category?: string | null;
    expectedFootfall: number;
    expected_footfall: number;
    startDate: string;
    start_date: string;
    endDate: string;
    end_date: string;
    status: string;
    website?: string | null;
    logoUrl?: string | null;
    image_url?: string | null;
    verificationStatus: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    tags: string[];
    sponsorship_tiers: Array<{
        id: string;
        name: string;
        price: number;
        amount: number;
        currency: string;
        description?: string | null;
        benefits?: string[];
        slots_available?: number;
    }>;
    organizer?: {
        id: string;
        name: string;
        logoUrl?: string | null;
        logo_url?: string | null;
    };
}

export interface BrowsableEventsResponse {
    data: BrowsableEvent[];
    total: number;
    page: number;
    page_size: number;
}

// ─── Sponsor Dashboard ────────────────────────────────────────────────

export interface SponsorDashboardStats {
    total_proposals: number;
    pending_proposals: number;
    approved_proposals: number;
    total_sponsorships: number;
    total_invested: number;
    currency: string;
}

// ─── Sponsorships ──────────────────────────────────────────────────────

export interface Sponsorship {
    id: string;
    tenantId: string;
    companyId: string;
    eventId: string;
    status: string;
    tier?: string | null;
    notes?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface SponsorshipsResponse {
    data: Sponsorship[];
    total: number;
    page: number;
    page_size: number;
}
