import { ReactNode } from "react";

interface TimelineItem {
    id: string;
    title: string;
    description?: string;
    time?: string;
    status?: "completed" | "active" | "pending" | "error";
    icon?: ReactNode;
}

interface TimelineProps {
    items: TimelineItem[];
    className?: string;
}

const dotColors = {
    completed: "bg-emerald-500 ring-emerald-100",
    active: "bg-brand-500 ring-brand-100 animate-pulse-glow",
    pending: "bg-slate-300 ring-slate-100",
    error: "bg-red-500 ring-red-100",
};

const lineColors = {
    completed: "bg-emerald-200",
    active: "bg-brand-200",
    pending: "bg-slate-200",
    error: "bg-red-200",
};

export default function Timeline({ items, className = "" }: TimelineProps) {
    return (
        <div className={`relative space-y-0 ${className}`}>
            {items.map((item, i) => {
                const status = item.status || "pending";
                const isLast = i === items.length - 1;

                return (
                    <div key={item.id} className="relative flex gap-4 pb-8 last:pb-0">
                        {/* Vertical line */}
                        {!isLast && (
                            <div
                                className={`absolute left-[11px] top-[28px] h-[calc(100%-16px)] w-0.5 ${lineColors[status]}`}
                            />
                        )}

                        {/* Dot */}
                        <div className="relative z-10 mt-1.5 flex-shrink-0">
                            <div
                                className={`h-[22px] w-[22px] rounded-full ring-4 ${dotColors[status]} flex items-center justify-center`}
                            >
                                {item.icon && (
                                    <span className="text-white text-xs">{item.icon}</span>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1 pt-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-text-primary">
                                    {item.title}
                                </p>
                                {item.time && (
                                    <span className="text-xs text-text-muted">{item.time}</span>
                                )}
                            </div>
                            {item.description && (
                                <p className="mt-1 text-sm text-text-secondary">
                                    {item.description}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
