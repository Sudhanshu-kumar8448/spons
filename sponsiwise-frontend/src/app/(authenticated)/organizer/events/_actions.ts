"use server";

import { redirect } from "next/navigation";
import { reviewProposal } from "@/lib/organizer-api";

export interface ReviewProposalState {
  success: boolean;
  error: string | null;
}

export async function reviewProposalAction(
  _prev: ReviewProposalState,
  formData: FormData,
): Promise<ReviewProposalState> {
  const id = formData.get("proposal_id") as string;
  const action = formData.get("action") as "approve" | "reject" | "request_changes";
  const reviewer_notes = (formData.get("reviewer_notes") as string)?.trim();

  if (!id) {
    return { success: false, error: "Proposal ID is required." };
  }
  if (!action || !["approve", "reject", "request_changes"].includes(action)) {
    return { success: false, error: "Invalid action." };
  }
  if (
    (action === "reject" || action === "request_changes") &&
    (!reviewer_notes || reviewer_notes.length < 5)
  ) {
    return {
      success: false,
      error:
        action === "reject"
          ? "Please provide a reason for rejection (at least 5 characters)."
          : "Please describe the changes you want (at least 5 characters).",
    };
  }

  try {
    await reviewProposal(id, { action, reviewer_notes: reviewer_notes || undefined });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to review proposal. Please try again.",
    };
  }

  redirect(`/organizer/events/proposals/${id}`);
}
