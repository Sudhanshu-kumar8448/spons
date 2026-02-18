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

// ─── Organizer Events ──────────────────────────────────────────────────

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
    status: string;
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
    sponsorship_tiers: {
        id: string;
        name: string;
        currency: string;
        amount: number;
        description: string;
        benefits: string[];
        slots_available: number;
        slots_total: number;
    }[];
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
    status: string;
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
}
