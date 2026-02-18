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
        <p className="mb-2 text-xs text-red-600">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
      >
        {isPending ? "Withdrawing…" : "Withdraw Proposal"}
      </button>
    </form>
  );
}
