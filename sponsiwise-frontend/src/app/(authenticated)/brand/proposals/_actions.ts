"use server";

import { redirect } from "next/navigation";
import { createProposal, withdrawProposal, resubmitProposal } from "@/lib/sponsor-api";
import type {
  CreateProposalPayload,
  ResubmitProposalPayload,
} from "@/lib/types/sponsor";

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

  let proposal;
  try {
    proposal = await createProposal(payload);
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to create proposal. Please try again.",
      proposalId: null,
    };
  }

  redirect(`/brand/proposals/${proposal.id}`);
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
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to withdraw proposal. Please try again.",
    };
  }

  redirect(`/brand/proposals/${id}`);
}

// ─── Resubmit proposal action ──────────────────────────────────────────

export interface ResubmitProposalState {
  success: boolean;
  error: string | null;
}

export async function resubmitProposalAction(
  _prev: ResubmitProposalState,
  formData: FormData,
): Promise<ResubmitProposalState> {
  const id = formData.get("proposal_id") as string;
  const amountRaw = formData.get("amount") as string;
  const proposedTier = (formData.get("proposed_tier") as string)?.trim() || undefined;
  const message = (formData.get("message") as string)?.trim() || undefined;

  if (!id) {
    return { success: false, error: "Proposal ID is required." };
  }

  const proposedAmount = amountRaw ? Number(amountRaw) : undefined;
  if (proposedAmount !== undefined && proposedAmount <= 0) {
    return { success: false, error: "Amount must be greater than zero." };
  }

  const payload: ResubmitProposalPayload = {
    proposedAmount,
    proposedTier,
    message,
  };

  try {
    await resubmitProposal(id, payload);
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to resubmit proposal. Please try again.",
    };
  }

  redirect(`/brand/proposals/${id}`);
}
