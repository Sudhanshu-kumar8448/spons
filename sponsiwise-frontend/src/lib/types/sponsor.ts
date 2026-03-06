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

// ─── Audience Profile (Sponsor view) ───────────────────────────────────

export type GenderType = 'MALE' | 'FEMALE' | 'OTHER';
export type AgeBracket = 'AGE_5_12' | 'AGE_12_17' | 'AGE_17_28' | 'AGE_28_45' | 'AGE_45_PLUS';
export type IncomeBracket = 'BELOW_2L' | 'BETWEEN_2L_5L' | 'BETWEEN_5L_10L' | 'BETWEEN_10L_25L' | 'ABOVE_25L';

export interface SponsorAudienceProfile {
    id: string;
    genders: { gender: GenderType; percentage: number }[];
    ages: { bracket: AgeBracket; percentage: number }[];
    incomes: { bracket: IncomeBracket; percentage: number }[];
    regions: { city: string; state: string; percentage: number }[];
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
    deliverableFormStatus?: 'SUBMITTED' | null;
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
    // Technology & Innovation
    | "TECHNOLOGY" | "TECH_CONFERENCE" | "DEVELOPER_CONFERENCE" | "HACKATHON"
    | "STARTUP_BOOTCAMP" | "STARTUP_DEMO_DAY" | "STARTUP_SUMMIT" | "PRODUCT_LAUNCH"
    | "PRODUCT_DEMO_ROADSHOW" | "AI_ML_SEMINAR" | "CYBERSECURITY" | "BLOCKCHAIN_WEB3"
    | "GAMING_ESPORTS" | "ESPORTS_TOURNAMENT" | "TECH_MEETUP" | "INNOVATION_CHALLENGE"
    | "ROBOTICS_COMPETITION" | "SCIENCE_FAIR" | "SPACE_TECH_EVENT"
    // Entertainment & Media
    | "MUSIC_ENTERTAINMENT" | "LIVE_CONCERT" | "MUSIC_FESTIVAL" | "DJ_NIGHT"
    | "THEATER_PLAY" | "COMEDY_SHOW" | "MOVIE_PREMIERE" | "FILM_SCREENING"
    | "DIGITAL_MEDIA" | "OTT_STREAMING_EVENT" | "AWARD_CEREMONY" | "FAN_MEETUP"
    | "INFLUENCER_MEETUP" | "CREATOR_FEST"
    // Business & Professional
    | "BUSINESS" | "CORPORATE_CONFERENCE" | "CORPORATE_OFFSITE" | "TRADE_FAIR_EXPO"
    | "INDUSTRY_EXPO" | "NETWORKING_MIXER" | "INVESTOR_PITCH" | "VC_PE_SUMMIT"
    | "SALES_MARKETING" | "ADVERTISING_AWARDS" | "BRAND_ACTIVATION" | "CSR_EVENT"
    | "FRANCHISE_EXPO" | "BUSINESS_AWARD_FUNCTION"
    // Education & Learning
    | "EDUCATION" | "WORKSHOP_SEMINAR" | "ONLINE_WEBINAR" | "HYBRID_EVENT"
    | "UNIVERSITY_LECTURE" | "COLLEGE_FEST" | "SCHOOL_ANNUAL_DAY" | "EDTECH_EXPO"
    | "SKILL_CERTIFICATION" | "CAREER_FAIR" | "EDUCATION_FAIR" | "COMPETITIVE_EXAM_SEMINAR"
    | "BOOK_LAUNCH" | "LITERARY_DISCUSSION"
    // Sports & Fitness
    | "SPORTS" | "TEAM_SPORTS_MATCH" | "LEAGUE_TOURNAMENT" | "MARATHON_RACE"
    | "CYCLING_EVENT" | "TRIATHLON" | "COMBAT_SPORTS" | "MOTORSPORT" | "AUTO_EXPO"
    | "OLYMPIC_QUALIFIER" | "FITNESS_EXPO" | "SPORTS_TECH" | "YOGA_CAMP" | "HEALTH_CAMP"
    // Cultural & Community
    | "CULTURAL" | "CULTURAL_FESTIVAL" | "RELIGIOUS_CEREMONY" | "RELIGIOUS_YATRA"
    | "NATIONAL_HOLIDAY" | "COMMUNITY_GALA" | "CHARITY_FUNDRAISER" | "NGO_EVENT"
    | "SOCIAL_ACTIVISM" | "POLITICAL_RALLY" | "PUBLIC_CAMPAIGN"
    // Arts & Creative
    | "ART_CREATIVE" | "ART_EXHIBITION" | "PHOTOGRAPHY_SHOW" | "FASHION_SHOW"
    | "DESIGN_EXPO" | "CRAFT_WORKSHOP" | "LITERARY_FESTIVAL" | "FILM_FESTIVAL"
    | "DANCE_COMPETITION" | "TALENT_SHOW"
    // Lifestyle & Consumer
    | "LIFESTYLE" | "FOOD_FESTIVAL" | "WINE_BEER_TASTING" | "TRAVEL_EXPO"
    | "HEALTH_WELLNESS" | "BEAUTY_COSMETICS" | "HOME_DECOR" | "PET_SHOW"
    | "MALL_ACTIVATION" | "POPUP_MARKET"
    // Government & Civic
    | "GOVERNMENT_CIVIC" | "POLICY_SUMMIT" | "PUBLIC_HEARING" | "ELECTION_EVENT"
    | "MILITARY_PARADE" | "GOVERNMENT_SCHEME_LAUNCH"
    // Logistics & Travel
    | "TRAVEL_TOURISM" | "AVIATION_EXPO" | "MARITIME_SHOW" | "LOGISTICS_FORUM" | "TRANSPORT_SUMMIT"
    // Agriculture & Rural
    | "AGRICULTURE_FARM" | "AGRI_EXPO" | "FARMERS_MEET" | "RURAL_DEVELOPMENT_EVENT"
    // Real Estate & Infrastructure
    | "REAL_ESTATE" | "PROPERTY_EXPO" | "INFRASTRUCTURE_SUMMIT"
    // Sustainability & Environment
    | "ENVIRONMENTAL_SUSTAINABILITY" | "CLIMATE_SUMMIT" | "CLEAN_ENERGY_EXPO" | "TREE_PLANTATION_DRIVE"
    // Misc
    | "PRIVATE_EVENT" | "INVITE_ONLY_EVENT" | "OTHER";

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
    audienceProfile?: SponsorAudienceProfile | null;
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
