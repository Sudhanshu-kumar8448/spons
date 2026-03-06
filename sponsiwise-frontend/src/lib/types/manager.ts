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
    custom_name?: string | null;
    asking_price: number;
    total_slots: number;
    sold_slots: number;
    available_slots: number;
    is_locked: boolean;
    is_active: boolean;
    is_available: boolean;
    deliverable_form_status?: DeliverableFormStatus | null;
}

// ─── Deliverables ────────────────────────────────────────────────────

export type DeliverableCategory = 'PHYSICAL' | 'DIGITAL';
export type BrandingType = 'EXCLUSIVE' | 'MULTI';
export type DeliverableUnit =
    | 'POSTS' | 'PIECES' | 'BOARDS' | 'DAYS' | 'HOURS'
    | 'MINUTES' | 'SESSIONS' | 'BANNERS' | 'PAGES'
    | 'SCREENS' | 'SPOTS' | 'OTHER';
export type DeliverableFormStatus = 'DRAFT' | 'SENT_TO_ORGANIZER' | 'FILLED' | 'SUBMITTED';

export interface DeliverableRow {
    id: string;
    category: DeliverableCategory;
    deliverableName: string;
    brandingType: BrandingType;
    quantity: number;
    unit: DeliverableUnit;
    otherUnit?: string | null;
    remarks?: string | null;
    sortOrder: number;
}

export interface DeliverableForm {
    id: string;
    tierId: string;
    status: DeliverableFormStatus;
    rows: DeliverableRow[];
    createdAt: string;
    updatedAt: string;
}

export interface DeliverableFormWithTier extends DeliverableForm {
    tier: {
        id: string;
        tierType: TierType;
        askingPrice: number;
        customName?: string | null;
    };
}

export interface DeliverableTemplate {
    id: string;
    name: string;
    description?: string | null;
    rows: Omit<DeliverableRow, 'id'>[];
    createdAt: string;
    updatedAt: string;
}

export interface TierCompareResult {
    tier1: { tierId: string; status: DeliverableFormStatus; rows: DeliverableRow[] } | null;
    tier2: { tierId: string; status: DeliverableFormStatus; rows: DeliverableRow[] } | null;
}

// ─── Audience Profile ────────────────────────────────────────────────

export type GenderType = 'MALE' | 'FEMALE' | 'OTHER';

export type AgeBracket =
    | 'AGE_5_12'
    | 'AGE_12_17'
    | 'AGE_17_28'
    | 'AGE_28_45'
    | 'AGE_45_PLUS';

export type IncomeBracket =
    | 'BELOW_2L'
    | 'BETWEEN_2L_5L'
    | 'BETWEEN_5L_10L'
    | 'BETWEEN_10L_25L'
    | 'ABOVE_25L';

export interface AudienceGender {
    id: string;
    gender: GenderType;
    percentage: number;
}

export interface AudienceAgeGroup {
    id: string;
    bracket: AgeBracket;
    percentage: number;
}

export interface AudienceIncomeGroup {
    id: string;
    bracket: IncomeBracket;
    percentage: number;
}

export interface AudienceRegion {
    id: string;
    city: string;
    state: string;
    percentage: number;
}

export interface AudienceProfile {
    id: string;
    genders: AudienceGender[];
    ages: AudienceAgeGroup[];
    incomes: AudienceIncomeGroup[];
    regions: AudienceRegion[];
    created_at: string;
    updated_at: string;
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
    tenantId?: string;
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
    rejectionReason?: string | null;
    verifiedAt?: string | null;
    verifiedBy?: { id: string; email: string } | null;
    owner?: { id: string; email: string; name?: string };
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
    audience_profile?: AudienceProfile | null;
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
