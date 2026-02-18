"use client";

import { useActionState } from "react";
import {
  reviewProposalAction,
  type ReviewProposalState,
} from "@/app/(authenticated)/dashboard/proposals/_organizer-actions";

interface ReviewProposalButtonsProps {
  proposalId: string;
}

const initialState: ReviewProposalState = {
  success: false,
  error: null,
};

/**
 * Client Component: Approve / Reject buttons with optional reviewer notes.
 * Uses `useActionState` to call the `reviewProposalAction` Server Action.
 */
export default function ReviewProposalButtons({
  proposalId,
}: ReviewProposalButtonsProps) {
  const [state, dispatch, isPending] = useActionState(
    reviewProposalAction,
    initialState,
  );

  return (
    <form action={dispatch} className="space-y-4">
      <input type="hidden" name="proposal_id" value={proposalId} />

      {/* Reviewer notes */}
      <div>
        <label
          htmlFor="reviewer_notes"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Reviewer Notes{" "}
          <span className="text-xs text-gray-400">
            (required for rejection)
          </span>
        </label>
        <textarea
          id="reviewer_notes"
          name="reviewer_notes"
          rows={3}
          placeholder="Add notes for the sponsor…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      {/* Error message */}
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="submit"
          name="action"
          value="approve"
          disabled={isPending}
          className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Processing…" : "✓ Approve"}
        </button>
        <button
          type="submit"
          name="action"
          value="reject"
          disabled={isPending}
          className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Processing…" : "✕ Reject"}
        </button>
      </div>
    </form>
  );
}
