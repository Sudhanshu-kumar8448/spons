import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerUser } from "@/lib/auth";
import { UserRole } from "@/lib/types/roles";
import { fetchSponsorProposalById } from "@/lib/sponsor-api";
import type { Proposal } from "@/lib/types/sponsor";
import { ProposalStatus } from "@/lib/types/sponsor";
import ProposalStatusBadge from "@/components/shared/ProposalStatusBadge";
import WithdrawButton from "./WithdrawButton";
import OrganizerProposalDetail from "@/components/organizer/OrganizerProposalDetail";

interface ProposalDetailPageProps {
  params: Promise<{ id: string }>;
}

// ─── Status-aware timeline ─────────────────────────────────────────────

function ProposalTimeline({ proposal }: { proposal: Proposal }) {
  const steps: { label: string; date: string | null; done: boolean }[] = [
    {
      label: "Created",
      date: proposal.created_at,
      done: true,
    },
    {
      label: "Submitted",
      date: proposal.submitted_at,
      done: !!proposal.submitted_at,
    },
    {
      label: "Reviewed",
      date: proposal.reviewed_at,
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
                ? "bg-blue-600 text-white"
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

// ─── Can-withdraw logic ────────────────────────────────────────────────

function canWithdraw(status: ProposalStatus): boolean {
  return (
    status === ProposalStatus.DRAFT ||
    status === ProposalStatus.SUBMITTED ||
    status === ProposalStatus.UNDER_REVIEW
  );
}

// ─── Page ──────────────────────────────────────────────────────────────

export default async function ProposalDetailPage({
  params,
}: ProposalDetailPageProps) {
  const { id } = await params;
  const user = await getServerUser();

  // Organizer role → incoming proposal detail with review
  if (user?.role === UserRole.ORGANIZER) {
    return <OrganizerProposalDetail id={id} />;
  }

  // Default: Sponsor proposal detail
  const proposal = await fetchSponsorProposalById(id).catch(() => null);

  if (!proposal) {
    notFound();
    return null; // Return to satisfy TS compliance
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
              className="font-medium text-blue-600 hover:text-blue-800"
            >
              {proposal.event.title}
            </Link>
          </p>
        </div>
        {canWithdraw(proposal.status) && (
          <WithdrawButton proposalId={proposal.id} />
        )}
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
                  Amount
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

          {/* Reviewer notes (only shown when reviewed) */}
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
                Reviewer Notes
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm text-gray-700">
                {proposal.reviewer_notes}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Event info */}
          <div className="rounded-xl bg-white p-6 shadow">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Event
            </h3>
            <div className="mt-4 space-y-2 text-sm">
              <p className="font-medium text-gray-900">
                {proposal.event.title}
              </p>
              <p className="text-gray-600">📍 {proposal.event.location}</p>
              {proposal.event.start_date && (
                <p className="text-gray-600">
                  🗓{" "}
                  {new Date(proposal.event.start_date).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    },
                  )}
                </p>
              )}
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
