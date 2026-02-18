import Link from "next/link";
import {
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    AlertCircle,
} from "lucide-react";
import { fetchManagerDashboardStats } from "@/lib/manager-api";
import type { ManagerDashboardStats } from "@/lib/types/manager";

/**
 * Manager Dashboard — verification overview with stats cards.
 */
export default async function ManagerDashboard() {
    let stats: ManagerDashboardStats | null = null;
    let error: string | null = null;

    try {
        stats = await fetchManagerDashboardStats();
    } catch (err) {
        error =
            err instanceof Error ? err.message : "Failed to load dashboard stats.";
    }

    if (error || !stats) {
        return (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
                <p className="mt-2 text-sm text-red-300">
                    {error ?? "Unable to load dashboard."}
                </p>
            </div>
        );
    }

    const cards = [
        {
            label: "Pending Companies",
            value: stats.pending_companies,
            icon: Clock,
            color: "text-amber-400",
            bgColor: "bg-amber-500/10",
            href: "/dashboard/companies?verification_status=PENDING",
        },
        {
            label: "Verified Companies",
            value: stats.verified_companies,
            icon: CheckCircle2,
            color: "text-emerald-400",
            bgColor: "bg-emerald-500/10",
            href: "/dashboard/companies?verification_status=VERIFIED",
        },
        {
            label: "Pending Events",
            value: stats.pending_events,
            icon: Clock,
            color: "text-amber-400",
            bgColor: "bg-amber-500/10",
            href: "/dashboard/events?verification_status=PENDING",
        },
        {
            label: "Verified Events",
            value: stats.verified_events,
            icon: CheckCircle2,
            color: "text-emerald-400",
            bgColor: "bg-emerald-500/10",
            href: "/dashboard/events?verification_status=VERIFIED",
        },
        {
            label: "Total Companies",
            value: stats.total_companies,
            icon: Building2,
            color: "text-blue-400",
            bgColor: "bg-blue-500/10",
            href: "/dashboard/companies",
        },
        {
            label: "Total Events",
            value: stats.total_events,
            icon: Calendar,
            color: "text-purple-400",
            bgColor: "bg-purple-500/10",
            href: "/dashboard/events",
        },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-white">Manager Dashboard</h1>
                <p className="mt-1 text-sm text-slate-400">
                    Verification queue overview and recent activity.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((card) => (
                    <Link
                        key={card.label}
                        href={card.href}
                        className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition-all hover:border-slate-700 hover:-translate-y-0.5 hover:shadow-lg"
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bgColor}`}
                            >
                                <card.icon className={`h-5 w-5 ${card.color}`} />
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                    {card.label}
                                </p>
                                <p className={`text-2xl font-bold text-white`}>{card.value}</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
