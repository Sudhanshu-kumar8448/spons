// ─── Public Events ─────────────────────────────────────────────────────

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
    status: string;
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

// ─── Platform Stats ────────────────────────────────────────────────────

export interface PlatformStats {
    total_events: number;
    total_companies: number;
    total_sponsors: number;
    total_organizers: number;
}
