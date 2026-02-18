"use server";

import { redirect } from "next/navigation";
import { createProposal, withdrawProposal } from "@/lib/sponsor-api";
import type { CreateProposalPayload } from "@/lib/types/sponsor";

// ─── Create proposal action ───────────────────────────────────────────

export interface CreateProposalState {
  success: boolean;
  error: string | null;
  proposalId: string | null;
}

export async function createProposalAction(
  _prev: CreateProposalState,
  formData: FormData,
): Promise<CreateProposalState> {
  const eventId = formData.get("event_id") as string;
  const amountRaw = formData.get("amount") as string;
  const proposedTier = (formData.get("proposed_tier") as string)?.trim() || undefined;
  const message = (formData.get("message") as string)?.trim() || undefined;

  // Basic server-side validation
  if (!eventId) {
    return { success: false, error: "Event is required.", proposalId: null };
  }
  const proposedAmount = amountRaw ? Number(amountRaw) : undefined;
  if (proposedAmount !== undefined && proposedAmount <= 0) {
    return {
      success: false,
      error: "Amount must be greater than zero.",
      proposalId: null,
    };
  }

  const payload: CreateProposalPayload = {
    eventId,
    proposedAmount,
    proposedTier,
    message,
  };

  try {
    const proposal = await createProposal(payload);
    // Redirect to the new proposal detail page on success
    redirect(`/dashboard/proposals/${proposal.id}`);

    // Unreachable return to satisfy TS if types are missing
    return { success: true, error: null, proposalId: proposal.id };
  } catch (err) {
    // redirect() throws a special error so we need to re-throw it
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to create proposal. Please try again.",
      proposalId: null,
    };
  }
}

// ─── Withdraw proposal action ──────────────────────────────────────────

export interface WithdrawProposalState {
  success: boolean;
  error: string | null;
}

export async function withdrawProposalAction(
  _prev: WithdrawProposalState,
  formData: FormData,
): Promise<WithdrawProposalState> {
  const id = formData.get("proposal_id") as string;

  if (!id) {
    return { success: false, error: "Proposal ID is required." };
  }

  try {
    await withdrawProposal(id);
    redirect(`/dashboard/proposals/${id}`);

    return { success: true, error: null };
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to withdraw proposal. Please try again.",
    };
  }
}
