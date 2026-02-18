import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchIncomingProposalById } from "@/lib/organizer-api";
import type { IncomingProposal } from "@/lib/types/organizer";
import { ProposalStatus } from "@/lib/types/sponsor";
import ProposalStatusBadge from "@/components/shared/ProposalStatusBadge";
import ReviewProposalButtons from "@/components/organizer/ReviewProposalButtons";

// ─── Timeline ──────────────────────────────────────────────────────────

function ProposalTimeline({ proposal }: { proposal: IncomingProposal }) {
  const steps: { label: string; date: string | null; done: boolean }[] = [
    {
      label: "Created",
      date: proposal.created_at,
      done: true,
    },
    {
      label: "Submitted",
      date: proposal.submitted_at ?? null,
      done: !!proposal.submitted_at,
    },
    {
      label: "Reviewed",
      date: proposal.reviewed_at ?? null,
      done: !!proposal.reviewed_at,
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
        Timeline
      </h3>
      <ol className="space-y-3">
        {steps.map((step) => (
          <li key={step.label} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step.done
                  ? "bg-green-600 text-white"
                  : "border-2 border-gray-300 text-gray-400"
                }`}
            >
              {step.done ? "✓" : "·"}
            </span>
            <div>
              <p
                className={`text-sm font-medium ${step.done ? "text-gray-900" : "text-gray-400"}`}
              >
                {step.label}
              </p>
              {step.date && (
                <p className="text-xs text-gray-500">
                  {new Date(step.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Can-review logic ──────────────────────────────────────────────────

function canReview(status: string): boolean {
  return (
    status === ProposalStatus.SUBMITTED ||
    status === ProposalStatus.UNDER_REVIEW
  );
}

// ─── Main component ────────────────────────────────────────────────────

export default async function OrganizerProposalDetail({
  id,
}: {
  id: string;
}) {
  let proposal: IncomingProposal;
  try {
    proposal = await fetchIncomingProposalById(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard/proposals"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        ← Back to proposals
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {proposal.title}
            </h1>
            <ProposalStatusBadge status={proposal.status} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            For{" "}
            <Link
              href={`/dashboard/events/${proposal.event_id}`}
              className="font-medium text-green-700 hover:text-green-900"
            >
              {proposal.event.title}
            </Link>
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">
              Proposal Details
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm text-gray-600">
              {proposal.description}
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">
              Financial Details
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Amount Offered
                </dt>
                <dd className="mt-1 text-xl font-bold text-gray-900">
                  {proposal.currency} {proposal.amount.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </dt>
                <dd className="mt-1">
                  <ProposalStatusBadge status={proposal.status} />
                </dd>
              </div>
            </dl>
          </div>

          {/* Reviewer notes (shown after review) */}
          {proposal.reviewer_notes && (
            <div
              className={`rounded-xl p-6 shadow ${proposal.status === ProposalStatus.APPROVED
                  ? "border border-green-200 bg-green-50"
                  : proposal.status === ProposalStatus.REJECTED
                    ? "border border-red-200 bg-red-50"
                    : "bg-white"
                }`}
            >
              <h2 className="text-lg font-semibold text-gray-900">
                Your Review Notes
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm text-gray-700">
                {proposal.reviewer_notes}
              </p>
            </div>
          )}

          {/* Review form (only for reviewable proposals) */}
          {canReview(proposal.status) && (
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Review This Proposal
              </h2>
              <ReviewProposalButtons proposalId={proposal.id} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Sponsor info */}
          <div className="rounded-xl bg-white p-6 shadow">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Sponsor
            </h3>
            <div className="mt-4 flex items-center gap-3">
              {proposal.sponsor.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proposal.sponsor.logo_url}
                  alt={proposal.sponsor.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-500">
                  {proposal.sponsor.name.charAt(0)}
                </span>
              )}
              <div>
                <p className="font-medium text-gray-900">
                  {proposal.sponsor.name}
                </p>
                <p className="text-xs text-gray-500">
                  {proposal.sponsor.email}
                </p>
              </div>
            </div>
          </div>

          {/* Event info */}
          <div className="rounded-xl bg-white p-6 shadow">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Event
            </h3>
            <div className="mt-4 text-sm">
              <Link
                href={`/dashboard/events/${proposal.event_id}`}
                className="font-medium text-green-700 hover:text-green-900"
              >
                {proposal.event.title}
              </Link>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl bg-white p-6 shadow">
            <ProposalTimeline proposal={proposal} />
          </div>
        </aside>
      </div>
    </div>
  );
}
