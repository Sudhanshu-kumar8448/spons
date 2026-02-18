import { fetchAuditLogs } from "@/lib/audit-api";
import type { AuditLogEntry } from "@/lib/types/audit";
import { normalizeError } from "@/lib/errors";
import { ErrorState, EmptyState, Pagination } from "@/components/shared";

const PAGE_SIZE = 20;

interface ActivityTimelineProps {
    searchParams?: {
        page?: string;
        entityType?: string;
        action?: string;
    };
    entries?: AuditLogEntry[];
}

function actionLabel(action: string): string {
    return action
        .replace(/\./g, " → ")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Timeline display for audit/activity log entries.
 * Can be used standalone with `entries` or as a page component with `searchParams`.
 */
export default async function ActivityTimeline({
    searchParams,
    entries: directEntries,
}: ActivityTimelineProps) {
    let entries: AuditLogEntry[] = directEntries ?? [];
    let total = 0;
    let error: string | null = null;
    const page = Number(searchParams?.page) || 1;

    if (!directEntries && searchParams) {
        try {
            const res = await fetchAuditLogs({
                page,
                pageSize: PAGE_SIZE,
                entityType: searchParams.entityType,
                action: searchParams.action,
            });
            entries = res.data;
            total = res.total;
        } catch (err) {
            error = normalizeError(err, "Failed to load activity.");
        }
    }

    if (error) return <ErrorState message={error} />;

    if (entries.length === 0) {
        return (
            <EmptyState
                icon="📋"
                heading="No activity"
                description="No activity to display."
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="space-y-0">
                {entries.map((entry, i) => (
                    <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
                        {/* Connector line */}
                        {i < entries.length - 1 && (
                            <div className="absolute left-[15px] top-8 h-full w-px bg-slate-700" />
                        )}

                        {/* Dot */}
                        <div className="relative z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800">
                            <span className="h-2 w-2 rounded-full bg-blue-400" />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-white">
                                    {actionLabel(entry.action)}
                                </p>
                                <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                                    {entry.entityType}
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                by {entry.actorRole.toLowerCase()} •{" "}
                                {new Date(entry.createdAt).toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination (only for searchParams mode) */}
            {searchParams && (
                <Pagination
                    page={page}
                    total={total}
                    pageSize={PAGE_SIZE}
                    buildHref={(p) => `/dashboard/activity?page=${p}`}
                />
            )}
        </div>
    );
}
