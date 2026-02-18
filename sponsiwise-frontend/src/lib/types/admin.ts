// ─── Admin Dashboard ───────────────────────────────────────────────────

export interface AdminDashboardStats {
    total_users: number;
    active_users: number;
    total_companies: number;
    total_events: number;
    total_proposals: number;
    total_sponsorships: number;
    inactive_users: number;
    recent_registrations: number;
    users_by_role: Record<string, number>;
    signup_trend: Array<{ date: string; count: number }>;
}

// ─── Users ─────────────────────────────────────────────────────────────

export interface TenantUserDetail {
    id: string;
    tenantId: string;
    email: string;
    name: string;
    role: string;
    avatar_url?: string | null;
    isActive: boolean;
    status: string;
    phone?: string | null;
    company_name?: string | null;
    last_login_at?: string | null;
    companyId?: string | null;
    organizerId?: string | null;
    createdAt: string;
    created_at: string;
    updatedAt: string;
    updated_at: string;
    company?: {
        id: string;
        name: string;
        slug?: string | null;
    } | null;
    organizer?: {
        id: string;
        name: string;
    } | null;
}

export interface TenantUsersResponse {
    data: TenantUserDetail[];
    total: number;
    page: number;
    page_size: number;
}

// ─── Role management ───────────────────────────────────────────────────

export type AssignableRole =
    | "USER"
    | "SPONSOR"
    | "ORGANIZER"
    | "MANAGER"
    | "ADMIN";

export const ASSIGNABLE_ROLES: AssignableRole[] = [
    "USER",
    "SPONSOR",
    "ORGANIZER",
    "MANAGER",
    "ADMIN",
];

export interface RoleUpdatePayload {
    role: AssignableRole;
}

// ─── Status management ────────────────────────────────────────────────

export interface StatusUpdatePayload {
    status: "active" | "inactive";
}
