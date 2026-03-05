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
    { label: "Dashboard", href: "/brand/dashboard", icon: "LayoutDashboard" },
    { label: "Browse Events", href: "/brand/browseEvents", icon: "Calendar" },
    { label: "My Proposals", href: "/brand/proposals", icon: "FileText" },
    { label: "Idea", href: "/brand/idea", icon: "Lightbulb" },
    { label: "Notifications", href: "/brand/notification", icon: "Bell" },
    { label: "Settings", href: "/brand/setting", icon: "Settings" },
  ],

  ORGANIZER: [
    { label: "Dashboard", href: "/organizer/dashboard", icon: "LayoutDashboard" },
    { label: "My Events", href: "/organizer/events", icon: "Calendar" },
    { label: "Proposals", href: "/organizer/events/proposals", icon: "FileText" },
    { label: "Notifications", href: "/organizer/notification", icon: "Bell" },
    { label: "Settings", href: "/organizer/setting", icon: "Settings" },
  ],

  MANAGER: [
    { label: "Dashboard", href: "/manager/dashboard", icon: "LayoutDashboard" },
    { label: "Verify Brands", href: "/manager/verifyBrands", icon: "ShieldCheck" },
    { label: "Verify Events", href: "/manager/verifyEvents", icon: "ShieldCheck" },
    { label: "Publish Events", href: "/manager/publishEvents", icon: "Rocket" },
    { label: "Cancel Events", href: "/manager/cancelEvents", icon: "Ban" },
    { label: "Past Events", href: "/manager/pastEvents", icon: "Archive" },
    { label: "Proposals", href: "/manager/proposals", icon: "FileText" },
    { label: "Notifications", href: "/manager/notification", icon: "Bell" },
    { label: "Settings", href: "/manager/setting", icon: "Settings" },
  ],

  ADMIN: [
    { label: "Dashboard", href: "/admin", icon: "LayoutDashboard" },
    { label: "Notifications", href: "/admin/notifications", icon: "Bell" },
    { label: "Settings", href: "/admin/settings", icon: "Settings" },
  ],
};
