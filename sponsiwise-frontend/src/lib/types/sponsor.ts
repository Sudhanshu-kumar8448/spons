// ─── Proposal ──────────────────────────────────────────────────────────

export type ProposalStatus =
    | "DRAFT"
    | "SUBMITTED"
    | "UNDER_MANAGER_REVIEW"
    | "FORWARDED_TO_ORGANIZER"
    | "APPROVED"
    | "REJECTED"
    | "REQUEST_CHANGES"
    | "WITHDRAWN";

export const ProposalStatus = {
    DRAFT: "DRAFT" as ProposalStatus,
    SUBMITTED: "SUBMITTED" as ProposalStatus,
    UNDER_MANAGER_REVIEW: "UNDER_MANAGER_REVIEW" as ProposalStatus,
    FORWARDED_TO_ORGANIZER: "FORWARDED_TO_ORGANIZER" as ProposalStatus,
    APPROVED: "APPROVED" as ProposalStatus,
    REJECTED: "REJECTED" as ProposalStatus,
    REQUEST_CHANGES: "REQUEST_CHANGES" as ProposalStatus,
    WITHDRAWN: "WITHDRAWN" as ProposalStatus,
} as const;

// ─── Event Status ───────────────────────────────────────────────────────

export type EventStatus =
    | "DRAFT"
    | "UNDER_MANAGER_REVIEW"
    | "VERIFIED"
    | "REJECTED"
    | "PUBLISHED"
    | "CANCELLED"
    | "COMPLETED";

export const EventStatus = {
    DRAFT: "DRAFT" as EventStatus,
    UNDER_MANAGER_REVIEW: "UNDER_MANAGER_REVIEW" as EventStatus,
    VERIFIED: "VERIFIED" as EventStatus,
    REJECTED: "REJECTED" as EventStatus,
    PUBLISHED: "PUBLISHED" as EventStatus,
    CANCELLED: "CANCELLED" as EventStatus,
    COMPLETED: "COMPLETED" as EventStatus,
} as const;

// ─── Tier Type ─────────────────────────────────────────────────────────

export type TierType =
    | "TITLE"
    | "PLATINUM"
    | "PRESENTING"
    | "POWERED_BY"
    | "GOLD"
    | "SILVER";

export const TierType = {
    TITLE: "TITLE" as TierType,
    PLATINUM: "PLATINUM" as TierType,
    PRESENTING: "PRESENTING" as TierType,
    POWERED_BY: "POWERED_BY" as TierType,
    GOLD: "GOLD" as TierType,
    SILVER: "SILVER" as TierType,
} as const;

export interface Proposal {
    id: string;
    tenantId: string;
    sponsorshipId: string;
    tierId?: string | null;
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
    proposedTier?: string;
    eventId: string;
    tierId: string;
    proposedAmount?: number;
    message?: string;
}

// ─── Browsable Events ──────────────────────────────────────────────────

export interface SponsorshipTier {
    id: string;
    tierType: TierType;
    askingPrice: number;
    totalSlots: number;
    soldSlots: number;
    availableSlots: number;
    isLocked: boolean;
    isActive: boolean;
}

export interface EventAddress {
    addressLine1?: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    country?: string;
    postalCode?: string;
}

export type EventCategory =
    | "TECHNOLOGY"
    | "MUSIC_ENTERTAINMENT"
    | "BUSINESS"
    | "EDUCATION"
    | "SPORTS"
    | "CULTURAL"
    | "ART_CREATIVE"
    | "LIFESTYLE"
    | "OTHER";

export interface BrowsableEvent {
    id: string;
    title: string;
    description?: string | null;
    location?: string | null;
    category: EventCategory | string;
    expectedFootfall: number;
    startDate: string;
    endDate: string;
    website?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
    tiers: SponsorshipTier[];
    address?: EventAddress | null;
    organizer?: {
        id: string;
        name: string;
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
