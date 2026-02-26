// ─── Public Events ─────────────────────────────────────────────────────

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

// ─── Sponsorship Tier ─────────────────────────────────────────────────

export interface PublicSponsorshipTier {
    id: string;
    tenantId: string;
    eventId: string;
    tierType: TierType;
    askingPrice: number;
    totalSlots: number;
    soldSlots: number;
    isLocked: boolean;
    isActive: boolean;
}

export interface PublicEvent {
    id: string;
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
    image_url?: string | null;
    category?: string | null;
    tags?: string[];
    slug?: string | null;
    organizer?: {
        id: string;
        name: string;
        logoUrl?: string | null;
        logo_url?: string | null;
    };
    tiers?: PublicSponsorshipTier[];
}

export interface PublicEventsResponse {
    data: PublicEvent[];
    total: number;
    page: number;
    page_size: number;
}

// ─── Public Companies ──────────────────────────────────────────────────

export interface PublicCompany {
    id: string;
    name: string;
    slug?: string | null;
    type: string;
    industry?: string | null;
    location?: string | null;
    founded_year?: number | null;
    website?: string | null;
    description?: string | null;
    logoUrl?: string | null;
    logo_url?: string | null;
    social_links?: {
        linkedin?: string | null;
        twitter?: string | null;
        facebook?: string | null;
        instagram?: string | null;
    };
    sponsored_events?: PublicEvent[];
}

export interface PublicCompaniesResponse {
    data: PublicCompany[];
    total: number;
    page: number;
    page_size: number;
}

// ─── Platform Stats ────────────────────────────────────────────────────

export interface PlatformStats {
    total_events: number;
    total_companies: number;
    total_sponsors: number;
    total_organizers: number;
}
