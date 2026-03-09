"use client";

import { useActionState } from "react";
import {
  withdrawProposalAction,
  type WithdrawProposalState,
} from "../_actions";

interface WithdrawButtonProps {
  proposalId: string;
}

const initialState: WithdrawProposalState = {
  success: false,
  error: null,
};

export default function WithdrawButton({ proposalId }: WithdrawButtonProps) {
  const [state, formAction, isPending] = useActionState(
    withdrawProposalAction,
    initialState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="proposal_id" value={proposalId} />
      {state.error && (
        <p className="mb-2 text-xs text-red-300">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {isPending ? "Withdrawing…" : "Withdraw Proposal"}
      </button>
    </form>
  );
}
