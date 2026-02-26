import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fetchManagerProposals } from "@/lib/manager-api";
import { ProposalStatus } from "@/lib/types/sponsor";
import ProposalStatusBadge from "@/components/shared/ProposalStatusBadge";

// ─── Filter tabs ───────────────────────────────────────────────────────

const statusFilters: { label: string; value: string }[] = [
    { label: "All", value: "" },
    { label: "Submitted", value: ProposalStatus.SUBMITTED },
    { label: "Under Review", value: ProposalStatus.UNDER_MANAGER_REVIEW },
    { label: "Forwarded", value: ProposalStatus.FORWARDED_TO_ORGANIZER },
    { label: "Approved", value: ProposalStatus.APPROVED },
    { label: "Rejected", value: ProposalStatus.REJECTED },
];

// ─── Empty / error states ──────────────────────────────────────────────

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 py-16">
            <span className="text-5xl">📋</span>
            <h2 className="mt-4 text-lg font-semibold text-white">
                {hasFilter ? "No matching proposals" : "No proposals to review"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
                {hasFilter
                    ? "Try removing filters to see all proposals."
                    : "When sponsors submit proposals, they will appear here for manager review."}
            </p>
        </div>
    );
}

function ErrorState({ message }: { message: string }) {
    return (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
            <span className="text-4xl">⚠️</span>
            <p className="mt-3 text-sm text-red-300">{message}</p>
        </div>
    );
}

// ─── Main component ────────────────────────────────────────────────────

interface ManagerProposalsListProps {
    searchParams: {
        page?: string;
        status?: string;
        search?: string;
    };
}

export default async function ManagerProposalsList({
    searchParams,
}: ManagerProposalsListProps) {
    const page = Number(searchParams.page) || 1;
    const statusFilter = searchParams.status ?? "";
    const searchFilter = searchParams.search ?? "";

    let proposals: any[] = [];
    let total = 0;
    let error: string | null = null;

    try {
        const res = await fetchManagerProposals({
            page,
            page_size: 10,
            status: statusFilter || undefined,
            search: searchFilter || undefined,
        });
        proposals = res.data;
        total = res.total;
    } catch (err) {
        error =
            err instanceof Error
                ? err.message
                : "Unable to load proposals. Please try again later.";
    }

    const hasFilter = !!statusFilter || !!searchFilter;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Proposal Review Inbox
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Review, edit, and forward sponsorship proposals to organizers.
                </p>
            </div>

            {/* Status filter tabs */}
            <div className="flex flex-wrap gap-2">
                {statusFilters.map((f) => {
                    const isActive = f.value === statusFilter;
                    const params = new URLSearchParams();
                    if (f.value) params.set("status", f.value);
                    if (searchFilter) params.set("search", searchFilter);
                    const query = params.toString();
                    return (
                        <Link
                            key={f.value}
                            href={`/dashboard/proposals${query ? `?${query}` : ""}`}
                            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${isActive
                                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900"
                                }`}
                        >
                            {f.label}
                        </Link>
                    );
                })}
            </div>

            {/* Results */}
            {error ? (
                <ErrorState message={error} />
            ) : proposals.length === 0 ? (
                <EmptyState hasFilter={hasFilter} />
            ) : (
                <>
                    <p className="text-sm text-gray-500">
                        Showing {proposals.length} of {total} proposal
                        {total !== 1 ? "s" : ""}
                    </p>

                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        Sponsor Company
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        Event
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        Proposed Amount
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {proposals.map((p) => (
                                    <tr
                                        key={p.id}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {p.sponsorship.company.logoUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={p.sponsorship.company.logoUrl}
                                                        alt={p.sponsorship.company.name}
                                                        className="h-8 w-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                                                        {p.sponsorship.company.name.charAt(0)}
                                                    </span>
                                                )}
                                                <span className="text-sm font-medium text-gray-900">
                                                    {p.sponsorship.company.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {p.sponsorship.event.title}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-green-600">
                                            ${Number(p.proposedAmount).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <ProposalStatusBadge status={p.status} />
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(p.createdAt).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/dashboard/proposals/${p.id}`}
                                                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                                            >
                                                Review Form →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {total > 10 && (
                        <div className="flex justify-center gap-4 pt-4">
                            {page > 1 && (
                                <Link
                                    href={`/dashboard/proposals?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ""}${searchFilter ? `&search=${searchFilter}` : ""}`}
                                    className="inline-flex items-center gap-1 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    <ChevronLeft className="h-4 w-4" /> Previous
                                </Link>
                            )}
                            {page * 10 < total && (
                                <Link
                                    href={`/dashboard/proposals?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ""}${searchFilter ? `&search=${searchFilter}` : ""}`}
                                    className="inline-flex items-center gap-1 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Next <ChevronRight className="h-4 w-4" />
                                </Link>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
