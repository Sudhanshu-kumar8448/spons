"use server";

import { redirect } from "next/navigation";
import { updateUserRole, updateUserStatus } from "@/lib/admin-api";
import { isRedirectError, normalizeError } from "@/lib/errors";
import { ASSIGNABLE_ROLES } from "@/lib/types/admin";
import type { AssignableRole } from "@/lib/types/admin";

// ─── Shared action state ───────────────────────────────────────────────

export interface AdminActionState {
  success: boolean;
  error: string | null;
}

// ─── Role assignment action ────────────────────────────────────────────

export async function updateUserRoleAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const userId = formData.get("user_id") as string;
  const role = formData.get("role") as string;
  const currentUserId = formData.get("current_user_id") as string;

  if (!userId) {
    return { success: false, error: "User ID is required." };
  }

  if (!role) {
    return { success: false, error: "Please select a role." };
  }

  // Guard: prevent assigning SUPER_ADMIN
  if (role === "SUPER_ADMIN") {
    return {
      success: false,
      error: "SUPER_ADMIN role cannot be assigned from this interface.",
    };
  }

  // Guard: role must be in allowed list
  if (!ASSIGNABLE_ROLES.includes(role as AssignableRole)) {
    return { success: false, error: `Invalid role: ${role}` };
  }

  // Guard: prevent self-demotion
  if (userId === currentUserId && role !== "ADMIN") {
    return {
      success: false,
      error:
        "You cannot change your own role. Ask another admin to do this.",
    };
  }

  try {
    await updateUserRole(userId, { role: role as AssignableRole });
    redirect(`/dashboard/users/${userId}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return {
      success: false,
      error: normalizeError(err, "Failed to update role. Please try again."),
    };
  }
}

// ─── Activate / Deactivate action ──────────────────────────────────────

export async function toggleUserStatusAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const userId = formData.get("user_id") as string;
  const newStatus = formData.get("new_status") as "active" | "inactive";
  const currentUserId = formData.get("current_user_id") as string;

  if (!userId) {
    return { success: false, error: "User ID is required." };
  }

  if (!newStatus || !["active", "inactive"].includes(newStatus)) {
    return { success: false, error: "Invalid status." };
  }

  // Guard: prevent self-deactivation
  if (userId === currentUserId && newStatus === "inactive") {
    return {
      success: false,
      error: "You cannot deactivate your own account.",
    };
  }

  try {
    await updateUserStatus(userId, { status: newStatus });
    redirect(`/dashboard/users/${userId}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return {
      success: false,
      error: normalizeError(err, "Failed to update user status. Please try again."),
    };
  }
}
