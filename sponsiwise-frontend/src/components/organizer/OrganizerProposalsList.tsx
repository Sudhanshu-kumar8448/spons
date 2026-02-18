import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fetchIncomingProposals } from "@/lib/organizer-api";
import type { IncomingProposal } from "@/lib/types/organizer";
import { ProposalStatus } from "@/lib/types/sponsor";
import ProposalStatusBadge from "@/components/shared/ProposalStatusBadge";

// ─── Filter tabs ───────────────────────────────────────────────────────

const statusFilters: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Submitted", value: ProposalStatus.SUBMITTED },
  { label: "Under Review", value: ProposalStatus.UNDER_REVIEW },
  { label: "Approved", value: ProposalStatus.APPROVED },
  { label: "Rejected", value: ProposalStatus.REJECTED },
];

// ─── Empty / error states ──────────────────────────────────────────────

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 py-16">
      <span className="text-5xl">📬</span>
      <h2 className="mt-4 text-lg font-semibold text-white">
        {hasFilter ? "No matching proposals" : "No proposals received yet"}
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        {hasFilter
          ? "Try removing filters to see all proposals."
          : "Once sponsors submit proposals for your events, they'll appear here."}
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

interface OrganizerProposalsListProps {
  searchParams: {
    page?: string;
    status?: string;
    event_id?: string;
  };
}

export default async function OrganizerProposalsList({
  searchParams,
}: OrganizerProposalsListProps) {
  const page = Number(searchParams.page) || 1;
  const statusFilter = searchParams.status ?? "";
  const eventIdFilter = searchParams.event_id;

  let proposals: IncomingProposal[] = [];
  let total = 0;
  let error: string | null = null;

  try {
    const res = await fetchIncomingProposals({
      page,
      page_size: 10,
      status: statusFilter || undefined,
      event_id: eventIdFilter,
    });
    proposals = res.data;
    total = res.total;
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Unable to load proposals. Please try again later.";
  }

  const hasFilter = !!statusFilter || !!eventIdFilter;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Incoming Proposals
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Review sponsorship proposals from sponsors.
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((f) => {
          const isActive = f.value === statusFilter;
          const params = new URLSearchParams();
          if (f.value) params.set("status", f.value);
          if (eventIdFilter) params.set("event_id", eventIdFilter);
          const query = params.toString();
          return (
            <Link
              key={f.value}
              href={`/dashboard/proposals${query ? `?${query}` : ""}`}
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

      {/* Event filter indicator */}
      {eventIdFilter && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>Filtered by event</span>
          <Link
            href={`/dashboard/proposals${statusFilter ? `?status=${statusFilter}` : ""}`}
            className="text-blue-400 hover:text-sky-300 font-medium transition-colors"
          >
            Clear event filter ×
          </Link>
        </div>
      )}

      {/* Results */}
      {error ? (
        <ErrorState message={error} />
      ) : proposals.length === 0 ? (
        <EmptyState hasFilter={hasFilter} />
      ) : (
        <>
          <p className="text-sm text-slate-500">
            Showing {proposals.length} of {total} proposal
            {total !== 1 ? "s" : ""}
          </p>

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Proposal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Sponsor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Received
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {proposals.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/proposals/${p.id}`}
                        className="text-sm font-medium text-blue-400 hover:text-sky-300 transition-colors"
                      >
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {p.sponsor.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.sponsor.logo_url}
                            alt={p.sponsor.name}
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300">
                            {p.sponsor.name.charAt(0)}
                          </span>
                        )}
                        <span className="text-sm text-slate-300">
                          {p.sponsor.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {p.event.title}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-white">
                      {p.currency} {p.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <ProposalStatusBadge status={p.status} />
                    </td>
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

          {/* Pagination */}
          {total > 10 && (
            <div className="flex justify-center gap-4 pt-4">
              {page > 1 && (
                <Link
                  href={`/dashboard/proposals?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ""}${eventIdFilter ? `&event_id=${eventIdFilter}` : ""}`}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white transition-all"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Link>
              )}
              {page * 10 < total && (
                <Link
                  href={`/dashboard/proposals?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ""}${eventIdFilter ? `&event_id=${eventIdFilter}` : ""}`}
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
