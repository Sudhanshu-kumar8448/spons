import Link from "next/link";
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { getServerUser } from "@/lib/auth";
import { UserRole } from "@/lib/types/roles";
import { fetchSponsorProposals } from "@/lib/sponsor-api";
import type { Proposal } from "@/lib/types/sponsor";
import { ProposalStatus } from "@/lib/types/sponsor";
import ProposalStatusBadge from "@/components/shared/ProposalStatusBadge";
import OrganizerProposalsList from "@/components/organizer/OrganizerProposalsList";

// ─── Filter tabs ───────────────────────────────────────────────────────

const statusFilters: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Draft", value: ProposalStatus.DRAFT },
  { label: "Submitted", value: ProposalStatus.SUBMITTED },
  { label: "Under Review", value: ProposalStatus.UNDER_REVIEW },
  { label: "Approved", value: ProposalStatus.APPROVED },
  { label: "Rejected", value: ProposalStatus.REJECTED },
  { label: "Withdrawn", value: ProposalStatus.WITHDRAWN },
];

// ─── Empty state ───────────────────────────────────────────────────────

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 py-16">
      <FileText className="h-12 w-12 text-slate-600" />
      <h2 className="mt-4 text-lg font-semibold text-white">
        {hasFilter ? "No matching proposals" : "No proposals yet"}
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        {hasFilter
          ? "Try removing filters to see all proposals."
          : "Browse events and submit your first sponsorship proposal."}
      </p>
      {!hasFilter && (
        <Link
          href="/dashboard/events"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
        >
          <Calendar className="h-4 w-4" />
          Browse events
        </Link>
      )}
    </div>
  );
}

// ─── Error state ───────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
      <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
      <p className="mt-3 text-sm text-red-300">{message}</p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────

interface ProposalsListPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    event_id?: string;
  }>;
}

export default async function ProposalsListPage({
  searchParams,
}: ProposalsListPageProps) {
  const params = await searchParams;
  const user = await getServerUser();

  // Organizer role → incoming proposals inbox
  if (user?.role === UserRole.ORGANIZER) {
    return <OrganizerProposalsList searchParams={params} />;
  }

  // Default: Sponsor proposals
  const page = Number(params.page) || 1;
  const statusFilter = params.status ?? "";

  let proposals: Proposal[] = [];
  let total = 0;
  let error: string | null = null;

  try {
    const res = await fetchSponsorProposals({
      page,
      page_size: 10,
      status: statusFilter || undefined,
    });
    proposals = res.data;
    total = res.total;
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Unable to load proposals. Please try again later.";
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Proposals</h1>
          <p className="mt-1 text-sm text-slate-400">
            Track all your sponsorship proposals.
          </p>
        </div>
        <Link
          href="/dashboard/events"
          className="group inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5 sm:self-center"
        >
          New proposal
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((f) => {
          const isActive = f.value === statusFilter;
          return (
            <Link
              key={f.value}
              href={`/dashboard/proposals${f.value ? `?status=${f.value}` : ""}`}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${isActive
                  ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-500/20"
                  : "border border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-white"
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
        <EmptyState hasFilter={!!statusFilter} />
      ) : (
        <>
          <p className="text-sm text-slate-500">
            Showing {proposals.length} of {total} proposal
            {total !== 1 ? "s" : ""}
          </p>

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Proposal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Event</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {proposals.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/proposals/${p.id}`}
                          className="text-sm font-medium text-blue-400 hover:text-sky-300 transition-colors"
                        >
                          {p.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">{p.event.title}</td>
                      <td className="px-6 py-4 text-sm font-medium text-white">
                        {p.currency} {p.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4"><ProposalStatusBadge status={p.status} /></td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(p.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {total > 10 && (
            <div className="flex justify-center gap-4 pt-4">
              {page > 1 && (
                <Link
                  href={`/dashboard/proposals?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ""}`}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white transition-all"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Link>
              )}
              {page * 10 < total && (
                <Link
                  href={`/dashboard/proposals?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ""}`}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white transition-all"
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
