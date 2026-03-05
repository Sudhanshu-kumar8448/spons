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
  const tierId = formData.get("tier_id") as string;
  const amountRaw = formData.get("amount") as string;
  const message = (formData.get("message") as string)?.trim() || undefined;

  if (!eventId) {
    return { success: false, error: "Event is required.", proposalId: null };
  }
  if (!tierId) {
    return { success: false, error: "Please select a sponsorship tier.", proposalId: null };
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
    tierId,
    proposedAmount,
    message,
  };

  try {
    const proposal = await createProposal(payload);
    redirect(`/brand/proposals/${proposal.id}`);
    return { success: true, error: null, proposalId: proposal.id };
  } catch (err) {
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
    redirect(`/brand/proposals/${id}`);
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
