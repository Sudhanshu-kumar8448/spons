"use client";

import { useActionState } from "react";
import {
  createProposalAction,
  type CreateProposalState,
} from "../_actions";

interface ProposalFormProps {
  /** Pre-selected event ID (from query param) */
  eventId: string;
  /** Event title for display */
  eventTitle: string;
}

const initialState: CreateProposalState = {
  success: false,
  error: null,
  proposalId: null,
};

/**
 * Client Component — proposal submission form.
 *
 * Uses React 19 `useActionState` to bind to the server action.
 * All actual data mutation happens server-side in _actions.ts.
 */
export default function ProposalForm({
  eventId,
  eventTitle,
}: ProposalFormProps) {
  const [state, formAction, isPending] = useActionState(
    createProposalAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden event_id */}
      <input type="hidden" name="event_id" value={eventId} />

      {/* Event display (read-only) */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-300">
          Event
        </label>
        <p className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white">
          {eventTitle}
        </p>
      </div>

      {/* Amount */}
      <div>
        <label
          htmlFor="amount"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Proposed Amount (optional)
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          min={1}
          step="0.01"
          placeholder="5000"
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Proposed Tier */}
      <div>
        <label
          htmlFor="proposed_tier"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Proposed Tier (optional)
        </label>
        <select
          id="proposed_tier"
          name="proposed_tier"
          defaultValue=""
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select a tier…</option>
          <option value="Bronze">Bronze</option>
          <option value="Silver">Silver</option>
          <option value="Gold">Gold</option>
          <option value="Platinum">Platinum</option>
          <option value="Title">Title</option>
        </select>
      </div>

      {/* Message */}
      <div>
        <label
          htmlFor="message"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Message (optional)
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Describe what you're offering and what you expect in return…"
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Error message */}
      {state.error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">{state.error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
        >
          {isPending ? "Submitting…" : "Submit Proposal"}
        </button>
        <a
          href="/dashboard/events"
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
