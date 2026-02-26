"use client";

import { useActionState } from "react";
import {
  createProposalAction,
  type CreateProposalState,
} from "../_actions";
import type { SponsorshipTier } from "@/lib/types/sponsor";

interface ProposalFormProps {
  /** Pre-selected event ID (from query param) */
  eventId: string;
  /** Event title for display */
  eventTitle: string;
  /** Available sponsorship tiers for this event */
  availableTiers: SponsorshipTier[];
}

const initialState: CreateProposalState = {
  success: false,
  error: null,
  proposalId: null,
};

/**
 * Helper to get display name for tier type
 */
function getTierDisplayName(tierType: string): string {
  const names: Record<string, string> = {
    TITLE: "Title Sponsor",
    PLATINUM: "Platinum",
    PRESENTING: "Presenting Sponsor",
    POWERED_BY: "Powered By",
    GOLD: "Gold",
    SILVER: "Silver",
  };
  return names[tierType] || tierType;
}

/**
 * Client Component — proposal submission form.
 *
 * Uses React 19 `useActionState` to bind to the server action.
 * All actual data mutation happens server-side in _actions.ts.
 */
export default function ProposalForm({
  eventId,
  eventTitle,
  availableTiers,
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

      {/* Proposed Tier - now uses actual tier IDs from event */}
      <div>
        <label
          htmlFor="tier_id"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Sponsorship Tier <span className="text-red-400">*</span>
        </label>
        {availableTiers.length === 0 ? (
          <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            No sponsorship tiers available for this event.
          </p>
        ) : (
          <>
            <select
              id="tier_id"
              name="tier_id"
              required
              defaultValue=""
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="" disabled>Select a tier…</option>
              {availableTiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {getTierDisplayName(tier.tierType)} - ${tier.askingPrice.toLocaleString()} ({tier.availableSlots} slots left)
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Only available tiers are shown. Slots are limited.
            </p>
          </>
        )}
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
          placeholder="Leave blank to use tier's asking price"
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
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
          disabled={isPending || availableTiers.length === 0}
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

