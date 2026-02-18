import type { TimelineEntry } from "@/lib/types/manager";

interface LifecycleTimelineProps {
    timeline: TimelineEntry[];
}

const typeColors: Record<string, { dot: string; border: string }> = {
    EVENT_CREATED: { dot: "bg-blue-500", border: "border-blue-200" },
    EVENT_VERIFIED: { dot: "bg-green-500", border: "border-green-200" },
    EVENT_REJECTED: { dot: "bg-red-500", border: "border-red-200" },
    PROPOSAL_SUBMITTED: { dot: "bg-yellow-500", border: "border-yellow-200" },
    PROPOSAL_APPROVED: { dot: "bg-green-500", border: "border-green-200" },
    PROPOSAL_REJECTED: { dot: "bg-red-500", border: "border-red-200" },
    EMAIL_SENT: { dot: "bg-indigo-500", border: "border-indigo-200" },
    EMAIL_FAILED: { dot: "bg-red-600", border: "border-red-300" },
};

/**
 * Vertical timeline for event lifecycle - used on event detail and lifecycle pages.
 */
export default function LifecycleTimeline({ timeline }: LifecycleTimelineProps) {
    if (timeline.length === 0) {
        return (
            <div className="rounded-xl bg-white p-8 text-center shadow">
                <p className="text-sm text-gray-400">No timeline events yet.</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl bg-white p-6 shadow">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Timeline
            </h3>
            <div className="space-y-0">
                {timeline.map((entry, i) => {
                    const colors = typeColors[entry.type] ?? {
                        dot: "bg-gray-400",
                        border: "border-gray-200",
                    };
                    const isFailed = entry.type === "EMAIL_FAILED";

                    return (
                        <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
                            {/* Connector */}
                            {i < timeline.length - 1 && (
                                <div className="absolute left-[11px] top-6 h-full w-px bg-gray-200" />
                            )}

                            {/* Dot */}
                            <div className="relative z-10 mt-1">
                                <span
                                    className={`block h-6 w-6 rounded-full border-2 ${colors.border} ${colors.dot}`}
                                />
                            </div>

                            {/* Content */}
                            <div
                                className={`min-w-0 flex-1 rounded-lg border p-3 ${isFailed ? "border-red-200 bg-red-50" : "border-gray-100"
                                    }`}
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className={`text-sm font-medium ${isFailed ? "text-red-700" : "text-gray-900"
                                            }`}
                                    >
                                        {entry.title}
                                    </span>
                                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                                        {entry.type.replace(/_/g, " ")}
                                    </span>
                                </div>
                                {entry.description && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        {entry.description}
                                    </p>
                                )}
                                <p className="mt-1 text-[10px] text-gray-400">
                                    {new Date(entry.timestamp).toLocaleString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
