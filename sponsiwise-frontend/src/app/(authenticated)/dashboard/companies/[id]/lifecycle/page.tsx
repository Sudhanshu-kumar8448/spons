import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchCompanyLifecycleView } from "@/lib/manager-api";
import type {
    CompanyLifecycleResponse,
    CompanyLifecycleStats,
    CompanyTimelineEntry,
    LifecycleProgress,
} from "@/lib/types/manager";
import LifecycleProgressBar from "@/components/manager/LifecycleProgressBar";
import CompanyLifecycleTimeline from "@/components/manager/CompanyLifecycleTimeline";

/**
 * /dashboard/companies/[id]/lifecycle
 *
 * Server Component — Company Lifecycle View for MANAGER role.
 *
 * Displays:
 *  1. Company header (name, type, verification badge, joined date)
 *  2. Stats grid (proposals, approved, emails, sponsorships)
 *  3. Progress bar
 *  4. Full chronological timeline
 *
 * TEST CASES:
 *  - Company with no proposals → only creation + verification entries
 *  - Company rejected → red rejection badge, timeline reflects rejection
 *  - Email failures → red indicators visible in stats + timeline
 *  - Large dataset → safe due to server-side rendering (no client-side state bloat)
 *  - Tenant isolation → Manager cannot view other tenant's companies (enforced by backend)
 */
export default async function CompanyLifecyclePage(props: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await props.params;

    let data: CompanyLifecycleResponse;
    try {
        data = await fetchCompanyLifecycleView(id);
    } catch {
        notFound();
    }

    const { company, stats, progress, timeline } = data;
    const hasFailed = stats.failedEmails > 0;

    return (
        <div className="space-y-8">
            {/* ── Back link ──────────────────────────────────────────── */}
            <Link
                href={`/dashboard/companies/${id}`}
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
                ← Back to company details
            </Link>

            {/* ── Company header ─────────────────────────────────────── */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    {company.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={company.logoUrl}
                            alt={company.name}
                            className="h-14 w-14 rounded-full object-cover"
                        />
                    ) : (
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-200 text-lg font-bold text-gray-500">
                            {company.name.charAt(0)}
                        </span>
                    )}
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">
                                {company.name}
                            </h1>
                            <VerificationBadge status={company.verificationStatus} />
                            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                {company.type}
                            </span>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                            <span>Owner: {company.owner?.email ?? "Unknown"}</span>
                            {company.website && (
                                <span className="text-blue-600">{company.website}</span>
                            )}
                            <span>
                                Joined{" "}
                                {new Date(company.createdAt).toLocaleDateString("en-US", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Stats grid ─────────────────────────────────────────── */}
            <StatsGrid stats={stats} />

            {/* ── Progress bar ───────────────────────────────────────── */}
            <LifecycleProgressBar progress={progress} hasFailed={hasFailed} />

            {/* ── Timeline ───────────────────────────────────────────── */}
            <CompanyLifecycleTimeline timeline={timeline} />
        </div>
    );
}

// ─── Verification badge ────────────────────────────────────────────────

function VerificationBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; cls: string }> = {
        VERIFIED: {
            label: "✅ Verified",
            cls: "bg-green-100 text-green-700",
        },
        REJECTED: {
            label: "❌ Rejected",
            cls: "bg-red-100 text-red-700",
        },
        PENDING: {
            label: "⏳ Pending",
            cls: "bg-yellow-100 text-yellow-700",
        },
    };
    const info = map[status] ?? map.PENDING;
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${info.cls}`}
        >
            {info.label}
        </span>
    );
}

// ─── Stats grid ────────────────────────────────────────────────────────

function StatsGrid({ stats }: { stats: CompanyLifecycleStats }) {
    const items: { label: string; value: number; color: string; icon: string }[] =
        [
            {
                label: "Total Proposals",
                value: stats.totalProposals,
                color: "text-blue-600",
                icon: "📤",
            },
            {
                label: "Approved",
                value: stats.approvedProposals,
                color: "text-green-600",
                icon: "✅",
            },
            {
                label: "Rejected",
                value: stats.rejectedProposals,
                color: "text-red-600",
                icon: "❌",
            },
            {
                label: "Sponsorships",
                value: stats.totalSponsorships,
                color: "text-purple-600",
                icon: "🤝",
            },
            {
                label: "Emails Sent",
                value: stats.totalEmails,
                color: "text-indigo-600",
                icon: "📧",
            },
            {
                label: "Email Failures",
                value: stats.failedEmails,
                color: stats.failedEmails > 0 ? "text-red-600" : "text-gray-400",
                icon: "⚠️",
            },
        ];

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {items.map((item) => (
                <div
                    key={item.label}
                    className="rounded-xl bg-white p-5 shadow border border-gray-100"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{item.icon}</span>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                            {item.label}
                        </p>
                    </div>
                    <p className={`mt-2 text-2xl font-bold ${item.color}`}>
                        {item.value}
                    </p>
                </div>
            ))}
        </div>
    );
}
