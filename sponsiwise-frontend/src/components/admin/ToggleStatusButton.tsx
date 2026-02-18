"use client";

import { useActionState, useState } from "react";
import type { AdminActionState } from "@/app/(authenticated)/dashboard/_admin-actions";

interface ToggleStatusButtonProps {
  userId: string;
  currentUserId: string;
  currentStatus: "active" | "inactive";
  userName: string;
  serverAction: (
    prev: AdminActionState,
    formData: FormData,
  ) => Promise<AdminActionState>;
}

const initialState: AdminActionState = { success: false, error: null };

/**
 * Client Component: Activate / Deactivate a user with confirmation.
 */
export default function ToggleStatusButton({
  userId,
  currentUserId,
  currentStatus,
  userName,
  serverAction,
}: ToggleStatusButtonProps) {
  const [state, dispatch, isPending] = useActionState(
    serverAction,
    initialState,
  );
  const [showConfirm, setShowConfirm] = useState(false);

  const isSelf = userId === currentUserId;
  const newStatus = currentStatus === "active" ? "inactive" : "active";
  const isDeactivating = newStatus === "inactive";

  if (!showConfirm) {
    return (
      <div className="space-y-2">
        {state.error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-sm text-red-700">{state.error}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            isDeactivating
              ? "bg-gray-600 text-white hover:bg-gray-700"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {isDeactivating ? "Deactivate user" : "Activate user"}
        </button>
      </div>
    );
  }

  return (
    <form action={dispatch} className="space-y-4">
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="new_status" value={newStatus} />
      <input type="hidden" name="current_user_id" value={currentUserId} />

      <div
        className={`rounded-lg border-2 p-4 ${
          isDeactivating
            ? "border-red-300 bg-red-50"
            : "border-green-300 bg-green-50"
        }`}
      >
        <p className="text-sm font-medium text-gray-900">
          {isDeactivating ? "Deactivate" : "Activate"} {userName}?
        </p>
        <p className="mt-1 text-xs text-gray-600">
          {isDeactivating
            ? "This user will be unable to log in or access the platform until reactivated."
            : "This user will regain access to their account and all features."}
        </p>
        {isSelf && isDeactivating && (
          <p className="mt-2 text-xs font-semibold text-red-700">
            ⚠ You cannot deactivate your own account.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending || (isSelf && isDeactivating)}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-colors ${
            isDeactivating
              ? "bg-red-600 hover:bg-red-700"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isPending
            ? "Processing…"
            : isDeactivating
              ? "Confirm deactivation"
              : "Confirm activation"}
        </button>
        <button
          type="button"
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
          className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
