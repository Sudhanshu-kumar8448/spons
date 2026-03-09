import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin, FileText } from "lucide-react";
import { fetchSponsorProposalById } from "@/lib/sponsor-api";
import type { Proposal } from "@/lib/types/sponsor";
import { ProposalStatus } from "@/lib/types/sponsor";
import ProposalStatusBadge from "@/components/shared/ProposalStatusBadge";
import WithdrawButton from "./WithdrawButton";
import ResubmitProposalForm from "./ResubmitProposalForm";
import { formatInr } from "@/lib/currency";

interface ProposalDetailPageProps {
  params: Promise<{ id: string }>;
}

// ─── Status-aware timeline ─────────────────────────────────────────────

function ProposalTimeline({ proposal }: { proposal: Proposal }) {
  const steps: { label: string; date: string | null; done: boolean }[] = [
    { label: "Created", date: proposal.created_at, done: true },
    { label: "Submitted", date: proposal.submitted_at, done: !!proposal.submitted_at },
    { label: "Reviewed", date: proposal.reviewed_at, done: !!proposal.reviewed_at },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Timeline
      </h3>
      <ol className="space-y-3">
        {steps.map((step) => (
          <li key={step.label} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step.done
                  ? "bg-sky-500 text-white"
                  : "border border-slate-700 text-slate-500"
              }`}
            >
              {step.done ? "✓" : "·"}
            </span>
            <div>
              <p className={`text-sm font-medium ${step.done ? "text-slate-100" : "text-slate-500"}`}>
                {step.label}
              </p>
              {step.date && (
                <p className="text-xs text-slate-400">
                  {new Date(step.date).toLocaleDateString("en-IN", {
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

function canWithdraw(status: ProposalStatus): boolean {
  return (
    status === ProposalStatus.DRAFT ||
    status === ProposalStatus.SUBMITTED ||
    status === ProposalStatus.UNDER_MANAGER_REVIEW
  );
}

function normalizeStatus(status: string): ProposalStatus {
  return status.toUpperCase() as ProposalStatus;
}

function formatDateTime(value: string | null): string {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Page ──────────────────────────────────────────────────────────────

export default async function BrandProposalDetailPage({
  params,
}: ProposalDetailPageProps) {
  const { id } = await params;

  let proposal: Proposal | null = null;
  let fetchError: string | null = null;

  try {
    proposal = await fetchSponsorProposalById(id);
  } catch (error) {
    // Handle different error types
    if (error && typeof error === 'object' && 'message' in error) {
      fetchError = (error as { message: string }).message;
    }
    // Log for debugging
    console.error('Error fetching proposal:', error);
  }

  if (fetchError || !proposal) {
    notFound();
    return null;
  }
  const status = normalizeStatus(proposal.status);

  return (
    <div className="space-y-5 sm:space-y-7">
      <Link
        href="/brand/proposals"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to proposals
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold text-white sm:text-2xl">
                {proposal.title || "Untitled Proposal"}
              </h1>
              <ProposalStatusBadge status={status} />
            </div>
            <p className="text-sm text-slate-400">
              For{" "}
              <Link
                href={`/brand/browseEvents/${proposal.event_id}`}
                className="font-medium text-blue-400 hover:text-sky-300"
              >
                {proposal.event.title}
              </Link>
            </p>
          </div>
          {canWithdraw(status) && (
            <WithdrawButton proposalId={proposal.id} />
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Amount</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {formatInr(proposal.amount)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Submitted</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-200">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              {formatDateTime(proposal.submitted_at)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Status</p>
            <div className="mt-1">
              <ProposalStatusBadge status={status} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-5 lg:col-span-2">
          {status === ProposalStatus.REQUEST_CHANGES && (
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 p-5 shadow-lg sm:p-6">
              <h2 className="text-lg font-semibold text-amber-100">
                Action Required: Manager Requested Changes
              </h2>
              <p className="mt-2 text-sm text-amber-200/90">
                Update your proposal below and submit the revised version.
              </p>
              <div className="mt-5">
                <ResubmitProposalForm
                  proposalId={proposal.id}
                  initialAmount={proposal.amount}
                  initialTier={proposal.proposedTier ?? proposal.title}
                  initialMessage={proposal.description}
                />
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg sm:p-6">
            <h2 className="text-lg font-semibold text-white">
              Previous Proposal Details
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">
              {proposal.description || "No proposal description provided."}
            </p>
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-slate-500">Tier</p>
              <p className="mt-1 text-slate-200">{proposal.proposedTier || proposal.title || "Not specified"}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg sm:p-6">
            <h2 className="text-lg font-semibold text-white">
              Financial Details
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Amount
                </dt>
                <dd className="mt-1 text-xl font-bold text-white">
                  {formatInr(proposal.amount)}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Current Status
                </dt>
                <dd className="mt-1">
                  <ProposalStatusBadge status={status} />
                </dd>
              </div>
            </dl>
          </div>

          {/* Reviewer notes */}
          {proposal.reviewer_notes && (
            <div
              className={`rounded-2xl border p-5 shadow-lg sm:p-6 ${
                status === ProposalStatus.APPROVED
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : status === ProposalStatus.REJECTED
                    ? "border-red-500/30 bg-red-500/10"
                    : status === ProposalStatus.REQUEST_CHANGES
                      ? "border-amber-500/30 bg-amber-500/10"
                      : "border-slate-800 bg-slate-900"
              }`}
            >
              <h2 className="text-lg font-semibold text-white">
                Reviewer Notes
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-200">
                {proposal.reviewer_notes}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg sm:p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Event
            </h3>
            <div className="mt-4 space-y-2 text-sm">
              <p className="font-medium text-white">{proposal.event.title}</p>
              <p className="flex items-start gap-1.5 text-slate-300">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>{proposal.event.location || "Location not available"}</span>
              </p>
              {proposal.event.start_date && (
                <p className="flex items-start gap-1.5 text-slate-300">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    {new Date(proposal.event.start_date).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg sm:p-6">
            <ProposalTimeline proposal={proposal} />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg sm:p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Proposal ID
            </h3>
            <p className="mt-2 flex items-start gap-1.5 break-all text-sm text-slate-300">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              {proposal.id}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
