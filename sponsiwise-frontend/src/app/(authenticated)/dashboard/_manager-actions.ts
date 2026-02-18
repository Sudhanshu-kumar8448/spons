"use server";

import { redirect } from "next/navigation";
import { verifyCompany, verifyEvent } from "@/lib/manager-api";
import { isRedirectError, normalizeError } from "@/lib/errors";

// ─── Shared verification state ─────────────────────────────────────────

export interface VerificationActionState {
  success: boolean;
  error: string | null;
}

// ─── Company verification action ───────────────────────────────────────

export async function verifyCompanyAction(
  _prev: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  const id = formData.get("entity_id") as string;
  const action = formData.get("action") as "verify" | "reject";
  const notes = (formData.get("notes") as string)?.trim();

  if (!id) {
    return { success: false, error: "Company ID is required." };
  }

  if (!action || !["verify", "reject"].includes(action)) {
    return { success: false, error: "Invalid action." };
  }

  if (action === "reject" && (!notes || notes.length < 5)) {
    return {
      success: false,
      error: "Please provide a reason for rejection (at least 5 characters).",
    };
  }

  try {
    await verifyCompany(id, {
      action,
      notes: notes || undefined,
    });
    redirect(`/dashboard/companies/${id}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return {
      success: false,
      error: normalizeError(err, "Failed to process verification. Please try again."),
    };
  }
}

// ─── Event verification action ─────────────────────────────────────────

export async function verifyEventAction(
  _prev: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  const id = formData.get("entity_id") as string;
  const action = formData.get("action") as "verify" | "reject";
  const notes = (formData.get("notes") as string)?.trim();

  if (!id) {
    return { success: false, error: "Event ID is required." };
  }

  if (!action || !["verify", "reject"].includes(action)) {
    return { success: false, error: "Invalid action." };
  }

  if (action === "reject" && (!notes || notes.length < 5)) {
    return {
      success: false,
      error: "Please provide a reason for rejection (at least 5 characters).",
    };
  }

  try {
    await verifyEvent(id, {
      action,
      notes: notes || undefined,
    });
    redirect(`/dashboard/events/${id}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return {
      success: false,
      error: normalizeError(err, "Failed to process verification. Please try again."),
    };
  }
}
