// ─── Manager Dashboard ─────────────────────────────────────────────────

export interface ManagerDashboardStats {
    pending_companies: number;
    pending_events: number;
    verified_companies: number;
    verified_events: number;
    total_companies: number;
    total_events: number;
}

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
    tenantId: string;
    organizerId: string;
    title: string;
    description?: string | null;
    location?: string | null;
    venue?: string | null;
    expectedFootfall: number;
    startDate: string;
    endDate: string;
    status: string;
    website?: string | null;
    logoUrl?: string | null;
    verificationStatus: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    organizer: {
        id: string;
        name: string;
        logoUrl?: string | null;
    };
}

export interface VerifiableEventsResponse {
    data: VerifiableEvent[];
    total: number;
    page: number;
    page_size: number;
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
