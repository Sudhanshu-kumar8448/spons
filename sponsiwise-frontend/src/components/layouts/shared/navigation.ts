import type { UserRole } from "@/lib/types/roles";

export interface NavItem {
  label: string;
  href: string;
  /** Lucide icon name – kept as a string so this file stays server-safe */
  icon: string;
}

/**
 * Navigation items for each role.
 * Add / remove entries here as features grow — every layout reads from
 * this single source of truth.
 */
export const navigationByRole: Record<UserRole | "PUBLIC", NavItem[]> = {
  USER: [{ label: "Home", href: "/", icon: "Home" }],

  PUBLIC: [
    { label: "Home", href: "/", icon: "Home" },
    { label: "Login", href: "/login", icon: "LogIn" },
    { label: "Register", href: "/register", icon: "UserPlus" },
  ],

  SPONSOR: [
    { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    { label: "Browse Events", href: "/dashboard/events", icon: "Calendar" },
    { label: "My Proposals", href: "/dashboard/proposals", icon: "FileText" },
    { label: "Notifications", href: "/dashboard/notifications", icon: "Bell" },
    { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
  ],

  ORGANIZER: [
    { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    { label: "My Events", href: "/dashboard/events", icon: "Calendar" },
    { label: "Proposals", href: "/dashboard/proposals", icon: "FileText" },
    { label: "Notifications", href: "/dashboard/notifications", icon: "Bell" },
    { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
  ],

  MANAGER: [
    { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    { label: "Companies", href: "/dashboard/companies", icon: "Building2" },
    { label: "Events", href: "/dashboard/events", icon: "Calendar" },
    { label: "Notifications", href: "/dashboard/notifications", icon: "Bell" },
    { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
  ],

  ADMIN: [
    { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    { label: "Users", href: "/dashboard/users", icon: "Users" },
    { label: "Notifications", href: "/dashboard/notifications", icon: "Bell" },
    { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
  ],
};
