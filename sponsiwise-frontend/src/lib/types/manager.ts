// ─── Manager Dashboard ─────────────────────────────────────────────────

export interface ManagerDashboardStats {
    pending_companies: number;
    pending_events: number;
    verified_companies: number;
    verified_events: number;
    total_companies: number;
    total_events: number;
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

// ─── Tier Type ────────────────────────────────────────────────────────

export type TierType =
    | "TITLE"
    | "PLATINUM"
    | "PRESENTING"
    | "POWERED_BY"
    | "GOLD"
    | "SILVER";

// ─── Sponsorship Tier ───────────────────────────────────────────────

export interface SponsorshipTier {
    id: string;
    tier_type: TierType;
    asking_price: number;
    total_slots: number;
    sold_slots: number;
    available_slots: number;
    is_locked: boolean;
    is_active: boolean;
    is_available: boolean;
}

// ─── Event Address ────────────────────────────────────────────────────

export interface EventAddress {
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
}

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

// ─── Verifiable Companies ──────────────────────────────────────────────

export interface VerifiableCompany {
    id: string;
    tenantId: string;
    name: string;
    slug?: string | null;
    type: string;
    website?: string | null;
    description?: string | null;
    logoUrl?: string | null;
    verificationStatus: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    owner?: { id: string; email: string };
    users?: Array<{
        id: string;
        email: string;
        role: string;
    }>;
}

export interface VerifiableCompaniesResponse {
    data: VerifiableCompany[];
    total: number;
    page: number;
    page_size: number;
}

// ─── Verifiable Events ─────────────────────────────────────────────────

export interface VerifiableEvent {
    id: string;
    title: string;
    slug?: string;
    description?: string | null;
    location?: string | null;
    venue?: string | null;
    expected_footfall?: number;
    start_date: string;
    end_date: string;
    status: string;
    image_url?: string | null;
    website?: string | null;
    category?: string;
    verification_status: string;
    verification_notes?: string | null;
    verified_at?: string | null;
    created_at: string;
    updated_at: string;
    organizer: {
        id: string;
        name: string;
        email?: string;
        logo_url?: string | null;
    };
    tags?: string[];
    sponsorship_tiers_summary?: {
        total_tiers: number;
        total_slots: number;
        sold_slots: number;
        available_slots: number;
        has_available_tiers: boolean;
    };
}

export interface VerifiableEventsResponse {
    data: VerifiableEvent[];
    total: number;
    page: number;
    page_size: number;
}

// ─── Event with Tiers (for Manager Detail View) ───────────────────────

export interface ManagerEventDetail extends VerifiableEvent {
    contact_phone?: string | null;
    contact_email?: string | null;
    ppt_deck_url?: string | null;
    address?: EventAddress | null;
    sponsorship_tiers: SponsorshipTier[];
}

// ─── Verification ──────────────────────────────────────────────────────

export interface VerificationPayload {
    status?: "VERIFIED" | "REJECTED";
    action?: "verify" | "reject";
    notes?: string;
}

// ─── Verification Status enum ──────────────────────────────────────────

export enum VerificationStatus {
    PENDING = "PENDING",
    VERIFIED = "VERIFIED",
    REJECTED = "REJECTED",
}

// ─── Activity Log ──────────────────────────────────────────────────────

export interface ActivityLogEntry {
    id: string;
    actorId: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}

export interface ActivityLogResponse {
    data: ActivityLogEntry[];
    total: number;
    page: number;
    page_size: number;
}

// ─── Lifecycle shared types ────────────────────────────────────────────

export interface LifecycleProgress {
    percentage: number;
    label: string;
    steps: Array<{
        label: string;
        completed: boolean;
    }>;
}

export interface TimelineEntry {
    id: string;
    type: string;
    title: string;
    description?: string | null;
    timestamp: string;
    metadata?: Record<string, unknown>;
}

export type CompanyTimelineEntry = TimelineEntry;

export interface CompanyLifecycleStats {
    totalProposals: number;
    approvedProposals: number;
    rejectedProposals: number;
    totalSponsorships: number;
    totalEmails: number;
    failedEmails: number;
}

// ─── Lifecycle responses ───────────────────────────────────────────────

export interface EventLifecycleResponse {
    event: VerifiableEvent;
    proposals: Array<{
        id: string;
        status: string;
        proposedTier?: string | null;
        proposedAmount?: number | null;
        createdAt: string;
        sponsorship: {
            company: {
                id: string;
                name: string;
            };
        };
    }>;
    progress: LifecycleProgress;
    timeline: TimelineEntry[];
}

export interface CompanyLifecycleResponse {
    company: VerifiableCompany;
    stats: CompanyLifecycleStats;
    progress: LifecycleProgress;
    timeline: CompanyTimelineEntry[];
}
