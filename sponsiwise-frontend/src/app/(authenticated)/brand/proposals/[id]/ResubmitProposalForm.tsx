"use client";

import { useActionState } from "react";
import {
  resubmitProposalAction,
  type ResubmitProposalState,
} from "../_actions";

interface ResubmitProposalFormProps {
  proposalId: string;
  initialAmount: number;
  initialTier?: string | null;
  initialMessage?: string | null;
}

const initialState: ResubmitProposalState = {
  success: false,
  error: null,
};

export default function ResubmitProposalForm({
  proposalId,
  initialAmount,
  initialTier,
  initialMessage,
}: ResubmitProposalFormProps) {
  const [state, formAction, pending] = useActionState(
    resubmitProposalAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="proposal_id" value={proposalId} />

      {state.error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="amount"
            className="text-xs font-medium uppercase tracking-wider text-slate-300"
          >
            Revised Amount
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            min={1}
            step="0.01"
            defaultValue={initialAmount}
            disabled={pending}
            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none disabled:opacity-60"
          />
        </div>

        <div>
          <label
            htmlFor="proposed_tier"
            className="text-xs font-medium uppercase tracking-wider text-slate-300"
          >
            Revised Tier
          </label>
          <input
            id="proposed_tier"
            name="proposed_tier"
            type="text"
            defaultValue={initialTier ?? ""}
            disabled={pending}
            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none disabled:opacity-60"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="message"
          className="text-xs font-medium uppercase tracking-wider text-slate-300"
        >
          Updated Proposal Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          defaultValue={initialMessage ?? ""}
          disabled={pending}
          className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none disabled:opacity-60"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-blue-500/20 sm:w-auto disabled:opacity-60"
      >
        {pending ? "Resubmitting..." : "Submit Revised Proposal"}
      </button>
    </form>
  );
}
