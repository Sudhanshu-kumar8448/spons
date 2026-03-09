"use client";

import { useActionState } from "react";
import {
  reviewProposalAction,
  type ReviewProposalState,
} from "@/app/(authenticated)/organizer/events/_actions";
import { formatInr } from "@/lib/currency";

interface ReviewProposalButtonsProps {
  proposalId: string;
  currentAmount?: number | null;
  currentTier?: string | null;
  currentNotes?: string | null;
}

const initialState: ReviewProposalState = {
  success: false,
  error: null,
};

/**
 * Client Component: Approve / Reject / Request Changes form.
 * Similar to the Manager ProposalReviewForm.
 */
export default function ReviewProposalButtons({
  proposalId,
  currentAmount,
  currentTier,
  currentNotes,
}: ReviewProposalButtonsProps) {
  const [state, dispatch, isPending] = useActionState(
    reviewProposalAction,
    initialState,
  );

  return (
    <form action={dispatch} className="space-y-5">
      <input type="hidden" name="proposal_id" value={proposalId} />

      {/* Current proposal summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Proposed Amount
          </p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {currentAmount ? formatInr(currentAmount) : "Not specified"}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Proposed Tier
          </p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {currentTier || "Not specified"}
          </p>
        </div>
      </div>

      {/* Reviewer notes */}
      <div>
        <label
          htmlFor="reviewer_notes"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Review Notes{" "}
          <span className="text-xs text-gray-400">
            (required for rejection &amp; request changes)
          </span>
        </label>
        <textarea
          id="reviewer_notes"
          name="reviewer_notes"
          rows={4}
          defaultValue={currentNotes ?? ""}
          placeholder="Add notes or feedback for the sponsor…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      {/* Error message */}
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      {/* Action buttons — 3 actions like manager */}
      <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
        <button
          type="submit"
          name="action"
          value="request_changes"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 shadow-sm transition-colors hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? "Processing…" : "⟲ Request Changes"}
        </button>
        <div className="flex-1" />
        <button
          type="submit"
          name="action"
          value="reject"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? "Processing…" : "✕ Reject"}
        </button>
        <button
          type="submit"
          name="action"
          value="approve"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? "Processing…" : "✓ Approve & Finalize Deal"}
        </button>
      </div>
    </form>
  );
}
