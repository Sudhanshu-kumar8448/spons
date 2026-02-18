"use client";

import { useActionState, useState } from "react";
import type { AdminActionState } from "@/app/(authenticated)/dashboard/_admin-actions";
import { ASSIGNABLE_ROLES } from "@/lib/types/admin";

interface RoleAssignmentFormProps {
  userId: string;
  currentUserId: string;
  currentRole: string;
  serverAction: (
    prev: AdminActionState,
    formData: FormData,
  ) => Promise<AdminActionState>;
}

const initialState: AdminActionState = { success: false, error: null };

const roleDescriptions: Record<string, string> = {
  SPONSOR: "Can browse events, create sponsorship proposals, manage company profiles.",
  ORGANIZER: "Can create events, review sponsorship proposals, manage event details.",
  MANAGER: "Can verify companies & events, view platform activity logs.",
  ADMIN: "Full tenant-level admin access — can manage users, roles, and view system metrics.",
};

/**
 * Client Component: Role assignment with confirmation step.
 * Prevents assigning SUPER_ADMIN and warns on self-demotion.
 */
export default function RoleAssignmentForm({
  userId,
  currentUserId,
  currentRole,
  serverAction,
}: RoleAssignmentFormProps) {
  const [state, dispatch, isPending] = useActionState(
    serverAction,
    initialState,
  );
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [showConfirm, setShowConfirm] = useState(false);

  const isSelf = userId === currentUserId;
  const hasChanged = selectedRole !== currentRole;

  const handleSubmitClick = () => {
    if (!hasChanged) return;
    setShowConfirm(true);
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setSelectedRole(currentRole);
  };

  return (
    <div className="space-y-4">
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      {!showConfirm ? (
        <>
          {/* Role selector */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-700">
              Assign Role
            </legend>
            {ASSIGNABLE_ROLES.map((role) => (
              <label
                key={role}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${
                  selectedRole === role
                    ? "border-red-400 bg-red-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="role_preview"
                  value={role}
                  checked={selectedRole === role}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="mt-0.5 accent-red-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {role}
                  </span>
                  <p className="text-xs text-gray-500">
                    {roleDescriptions[role] ?? ""}
                  </p>
                </div>
              </label>
            ))}
          </fieldset>

          {/* Save button */}
          <button
            type="button"
            onClick={handleSubmitClick}
            disabled={!hasChanged}
            className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              hasChanged
                ? "bg-red-600 text-white hover:bg-red-700"
                : "cursor-not-allowed bg-gray-200 text-gray-500"
            }`}
          >
            {hasChanged
              ? `Change role to ${selectedRole}`
              : "Select a different role"}
          </button>
        </>
      ) : (
        /* Confirmation dialog */
        <form action={dispatch} className="space-y-4">
          <input type="hidden" name="user_id" value={userId} />
          <input type="hidden" name="role" value={selectedRole} />
          <input type="hidden" name="current_user_id" value={currentUserId} />

          <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
            <p className="text-sm font-medium text-gray-900">
              Confirm role change
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Change this user&apos;s role from{" "}
              <strong>{currentRole}</strong> to{" "}
              <strong>{selectedRole}</strong>?
            </p>
            {isSelf && selectedRole !== "ADMIN" && (
              <p className="mt-2 text-xs font-semibold text-red-700">
                ⚠ You are changing your own role. You will lose admin access.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Saving…" : "Confirm change"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
