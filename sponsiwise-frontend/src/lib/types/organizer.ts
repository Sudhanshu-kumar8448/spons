// ─── Organizer Dashboard ───────────────────────────────────────────────

export interface OrganizerDashboardStats {
    total_events: number;
    active_events: number;
    total_proposals: number;
    pending_proposals: number;
    approved_proposals: number;
    total_sponsorships: number;
    published_events: number;
    total_proposals_received: number;
    total_sponsorship_revenue: number;
    currency: string;
}

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
    | "PRESENTING"
    | "POWERED_BY"
    | "GOLD"
    | "SILVER";

export const TierType = {
    TITLE: "TITLE" as TierType,
    PRESENTING: "PRESENTING" as TierType,
    POWERED_BY: "POWERED_BY" as TierType,
    GOLD: "GOLD" as TierType,
    SILVER: "SILVER" as TierType,
} as const;

// ─── Proposal Status ───────────────────────────────────────────────────

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

// ─── Organizer Events ──────────────────────────────────────────────────

export interface SponsorshipTier {
    id: string;
    tenantId: string;
    eventId: string;
    tierType: TierType;
    askingPrice: number;
    totalSlots: number;
    soldSlots: number;
    isLocked: boolean;
    isActive: boolean;
    name?: string;
    description?: string;
    benefits?: string[];
    currency?: string;
    amount?: number;
    slots_total?: number;
    slots_available?: number;
}

export interface OrganizerEvent {
    id: string;
    tenantId: string;
    organizerId: string;
    title: string;
    description?: string | null;
    location?: string | null;
    venue?: string | null;
    expectedFootfall: number;
    expected_footfall: number;
    startDate: string;
    start_date: string;
    endDate: string;
    end_date: string;
    status: EventStatus;
    website?: string | null;
    logoUrl?: string | null;
    logo_url?: string | null;
    image_url?: string | null;
    category?: string | null;
    tags?: string[];
    verificationStatus: string;
    isActive: boolean;
    createdAt: string;
    created_at: string;
    updatedAt: string;
    updated_at: string;
    total_proposals: number;
    pending_proposals: number;
    total_sponsorship_amount: number;
    currency: string;
    tiers: SponsorshipTier[];
}

export interface OrganizerEventsResponse {
    data: OrganizerEvent[];
    total: number;
    page: number;
    page_size: number;
}

// ─── Incoming Proposals ────────────────────────────────────────────────

export interface IncomingProposal {
    id: string;
    tenantId: string;
    sponsorshipId: string;
    tierId?: string | null;
    status: ProposalStatus;
    title: string;
    amount: number;
    currency: string;
    description?: string | null;
    proposedTier?: string | null;
    proposedAmount?: number | null;
    message?: string | null;
    notes?: string | null;
    reviewer_notes?: string | null;
    submittedAt?: string | null;
    submitted_at?: string | null;
    reviewedAt?: string | null;
    reviewed_at?: string | null;
    isActive: boolean;
    createdAt: string;
    created_at: string;
    updatedAt: string;
    updated_at: string;
    event_id?: string;
    sponsor: {
        id: string;
        name: string;
        email?: string;
        logo_url?: string | null;
    };
    event: {
        id: string;
        title: string;
    };
}

export interface IncomingProposalsResponse {
    data: IncomingProposal[];
    total: number;
    page: number;
    page_size: number;
}

// ─── Review Proposal ───────────────────────────────────────────────────

export interface ReviewProposalPayload {
    decision?: "APPROVED" | "REJECTED";
    action?: "approve" | "reject";
    notes?: string;
    reviewer_notes?: string;
}

// ─── Create Event ──────────────────────────────────────────────────────

export interface CreateEventPayload {
    title: string;
    description?: string;
    location?: string;
    venue?: string;
    startDate: string;
    endDate: string;
    expectedFootfall: number;
    website?: string;
    logoUrl?: string;
    category?: string;
    address?: {
        addressLine1: string;
        addressLine2?: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
    };
    contactPhone?: string;
    contactEmail?: string;
    pptDeckUrl?: string;
    tiers?: {
        tierType: TierType | "CUSTOM";
        customName?: string;
        askingPrice: number;
        totalSlots?: number;
        benefits?: string[];
        id?: string;
    }[];
}
