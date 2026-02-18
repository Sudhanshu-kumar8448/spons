/**
 * Barrel export for all shared UI components.
 *
 * Import from here instead of reaching into individual files:
 *
 * ```ts
 * import { DataTable, StatusBadge, Pagination, ErrorState } from "@/components/shared";
 * ```
 */

// ─── Data display ──────────────────────────────────────────────────────
export { default as DataTable } from "./DataTable";
export type { Column } from "./DataTable";
export { default as Pagination } from "./Pagination";
export { default as FilterTabs } from "./FilterTabs";
export type { FilterTab } from "./FilterTabs";
export { default as SearchBar } from "./SearchBar";

// ─── Badges ────────────────────────────────────────────────────────────
export { default as StatusBadge } from "./StatusBadge";
export type { BadgeVariant } from "./StatusBadge";

// Legacy domain-specific badges (kept for backward compat during migration)
export { default as ProposalStatusBadge } from "./ProposalStatusBadge";
export { default as VerificationStatusBadge } from "./VerificationStatusBadge";
export { default as RoleBadge } from "./RoleBadge";
export { default as UserStatusBadge } from "./UserStatusBadge";

// ─── Form elements ─────────────────────────────────────────────────────
export { default as Button } from "./Button";
export { default as FormField } from "./FormField";
export { default as TextAreaField } from "./TextAreaField";
export { default as SelectField } from "./SelectField";
export type { SelectOption } from "./SelectField";

// ─── States ────────────────────────────────────────────────────────────
export { default as ErrorState } from "./ErrorState";
export { default as EmptyState } from "./EmptyState";
export { default as ConfirmDialog } from "./ConfirmDialog";

// ─── Notifications & Activity ──────────────────────────────────────────
export { default as NotificationsDropdown } from "./NotificationsDropdown";
export { default as NotificationList } from "./NotificationList";
export { default as ActivityTimeline } from "./ActivityTimeline";

// ─── Loading skeletons ─────────────────────────────────────────────────
export {
  SearchBarSkeleton,
  FilterTabsSkeleton,
  StatCardSkeleton,
  StatsGridSkeleton,
  TableSkeleton,
  AvatarTableSkeleton,
  ListRowSkeleton,
  DetailCardSkeleton,
  ListPageSkeleton,
  DashboardPageSkeleton,
  DetailPageSkeleton,
} from "./LoadingSkeleton";
