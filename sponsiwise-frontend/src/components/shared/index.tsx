import React from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

// ─── Re-exports ────────────────────────────────────────────────────────

export { default as DataTable } from "./DataTable";
export { default as RoleBadge } from "./RoleBadge";
export { default as UserStatusBadge } from "./UserStatusBadge";
export { default as ProposalStatusBadge } from "./ProposalStatusBadge";
export { default as NotificationsDropdown } from "./NotificationsDropdown";
export { default as NotificationList } from "./NotificationList";
export { default as ActivityTimeline } from "./ActivityTimeline";

// ─── ErrorState ────────────────────────────────────────────────────────

export function ErrorState({ message }: { message: string }) {
    return (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
            <p className="mt-2 text-sm text-red-300">{message}</p>
        </div>
    );
}

// ─── EmptyState ────────────────────────────────────────────────────────

export function EmptyState({
    icon,
    heading,
    description,
}: {
    icon: string;
    heading: string;
    description: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
            <span className="text-4xl">{icon}</span>
            <h3 className="mt-3 text-lg font-semibold text-white">{heading}</h3>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
    );
}

// ─── SearchBar ─────────────────────────────────────────────────────────

export function SearchBar({
    defaultValue,
    placeholder = "Search…",
    color = "blue",
    hiddenFields,
}: {
    defaultValue?: string;
    placeholder?: string;
    color?: string;
    hiddenFields?: Record<string, string | undefined>;
}) {
    return (
        <form className="relative">
            <input
                type="text"
                name="search"
                defaultValue={defaultValue}
                placeholder={placeholder}
                className={`w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-colors focus:border-${color}-500 focus:outline-none focus:ring-1 focus:ring-${color}-500`}
            />
            <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
            </svg>
            {hiddenFields &&
                Object.entries(hiddenFields).map(
                    ([key, value]) =>
                        value && (
                            <input key={key} type="hidden" name={key} value={value} />
                        ),
                )}
        </form>
    );
}

// ─── FilterTabs ────────────────────────────────────────────────────────

export function FilterTabs({
    tabs,
    activeValue,
    buildHref,
    activeColor = "bg-blue-600",
}: {
    tabs: Array<{ value: string; label: string }>;
    activeValue: string;
    buildHref: (value: string) => string;
    activeColor?: string;
}) {
    return (
        <div className="flex flex-wrap gap-1">
            {tabs.map((tab) => {
                const isActive = activeValue === tab.value;
                return (
                    <Link
                        key={tab.value}
                        href={buildHref(tab.value)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${isActive
                            ? `${activeColor} text-white`
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            }`}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </div>
    );
}

// ─── Pagination ────────────────────────────────────────────────────────

export function Pagination({
    page,
    total,
    pageSize,
    buildHref,
    showPageLabel = false,
}: {
    page: number;
    total: number;
    pageSize: number;
    buildHref: (page: number) => string;
    showPageLabel?: boolean;
}) {
    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center gap-2">
            {page > 1 && (
                <Link
                    href={buildHref(page - 1)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800"
                >
                    Previous
                </Link>
            )}
            {showPageLabel && (
                <span className="text-sm text-slate-500">
                    Page {page} of {totalPages}
                </span>
            )}
            {page < totalPages && (
                <Link
                    href={buildHref(page + 1)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800"
                >
                    Next
                </Link>
            )}
        </div>
    );
}

// ─── Skeleton components ───────────────────────────────────────────────

export function DashboardPageSkeleton({ statCount = 4, tableRows = 3 }: { statCount?: number; tableRows?: number } = {}) {
    return (
        <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 rounded-lg bg-slate-800" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: statCount }).map((_, i) => (
                    <div
                        key={i}
                        className="h-28 rounded-2xl border border-slate-800 bg-slate-900"
                    />
                ))}
            </div>
            <div className="space-y-2">
                {Array.from({ length: tableRows }).map((_, i) => (
                    <div
                        key={i}
                        className="h-16 rounded-xl border border-slate-800 bg-slate-900"
                    />
                ))}
            </div>
        </div>
    );
}

export function ListPageSkeleton({
    tabCount = 4,
    tableRows = 6,
    tableColumns = 4,
    showAvatar = false,
}: {
    tabCount?: number;
    tableRows?: number;
    tableColumns?: number;
    showAvatar?: boolean;
} = {}) {
    return (
        <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded-lg bg-slate-800" />
            <div className="h-10 rounded-xl bg-slate-800" />
            {/* Tabs */}
            <div className="flex gap-2">
                {Array.from({ length: tabCount }).map((_, i) => (
                    <div key={i} className="h-8 w-20 rounded-lg bg-slate-800" />
                ))}
            </div>
            {/* Table rows */}
            <div className="space-y-2">
                {Array.from({ length: tableRows }).map((_, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-4 h-16 rounded-xl border border-slate-800 bg-slate-900 px-4"
                    >
                        {showAvatar && (
                            <div className="h-8 w-8 shrink-0 rounded-full bg-slate-800" />
                        )}
                        {Array.from({ length: tableColumns }).map((_, j) => (
                            <div
                                key={j}
                                className="h-4 flex-1 rounded bg-slate-800"
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ListRowSkeleton({ count = 5 }: { count?: number } = {}) {
    return (
        <div className="animate-pulse space-y-2">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="h-14 rounded-xl border border-slate-800 bg-slate-900"
                />
            ))}
        </div>
    );
}

export function DetailPageSkeleton({ sidebarCards = 0 }: { sidebarCards?: number } = {}) {
    return (
        <div className={`animate-pulse ${sidebarCards > 0 ? "grid gap-8 lg:grid-cols-3" : "space-y-6"}`}>
            <div className={`space-y-6 ${sidebarCards > 0 ? "lg:col-span-2" : ""}`}>
                <div className="h-6 w-24 rounded-lg bg-slate-800" />
                <div className="h-10 w-64 rounded-lg bg-slate-800" />
                <div className="grid gap-4 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="h-20 rounded-xl border border-slate-800 bg-slate-900"
                        />
                    ))}
                </div>
            </div>
            {sidebarCards > 0 && (
                <aside className="space-y-6">
                    {Array.from({ length: sidebarCards }).map((_, i) => (
                        <div
                            key={i}
                            className="h-48 rounded-xl border border-slate-800 bg-slate-900"
                        />
                    ))}
                </aside>
            )}
        </div>
    );
}

export function FilterTabsSkeleton({ count = 4 }: { count?: number } = {}) {
    return (
        <div className="flex animate-pulse gap-2">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="h-8 w-16 rounded-lg bg-slate-800" />
            ))}
        </div>
    );
}
