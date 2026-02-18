"use server";

import { redirect } from "next/navigation";
import { reviewProposal } from "@/lib/organizer-api";

// ─── Review proposal action ───────────────────────────────────────────

export interface ReviewProposalState {
  success: boolean;
  error: string | null;
}

export async function reviewProposalAction(
  _prev: ReviewProposalState,
  formData: FormData,
): Promise<ReviewProposalState> {
  const id = formData.get("proposal_id") as string;
  const action = formData.get("action") as "approve" | "reject";
  const reviewer_notes = (
    formData.get("reviewer_notes") as string
  )?.trim();

  if (!id) {
    return { success: false, error: "Proposal ID is required." };
  }

  if (!action || !["approve", "reject"].includes(action)) {
    return { success: false, error: "Invalid action." };
  }

  if (action === "reject" && (!reviewer_notes || reviewer_notes.length < 5)) {
    return {
      success: false,
      error: "Please provide a reason for rejection (at least 5 characters).",
    };
  }

  try {
    await reviewProposal(id, {
      action,
      reviewer_notes: reviewer_notes || undefined,
    });
    redirect(`/dashboard/proposals/${id}`);

    return { success: true, error: null };
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
          : "Failed to review proposal. Please try again.",
    };
  }
}
