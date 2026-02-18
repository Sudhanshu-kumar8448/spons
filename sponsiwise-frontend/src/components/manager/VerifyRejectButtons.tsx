"use client";

import { useActionState, useState } from "react";
import type { VerificationActionState } from "@/app/(authenticated)/dashboard/_manager-actions";

interface VerifyRejectButtonsProps {
  entityId: string;
  entityType: "company" | "event";
  serverAction: (
    prev: VerificationActionState,
    formData: FormData,
  ) => Promise<VerificationActionState>;
}

const initialState: VerificationActionState = {
  success: false,
  error: null,
};

/**
 * Client Component: Verify / Reject buttons with confirmation dialog
 * and optional notes. Uses `useActionState` for the Server Action.
 */
export default function VerifyRejectButtons({
  entityId,
  entityType,
  serverAction,
}: VerifyRejectButtonsProps) {
  const [state, dispatch, isPending] = useActionState(
    serverAction,
    initialState,
  );
  const [confirmAction, setConfirmAction] = useState<
    "verify" | "reject" | null
  >(null);

  const handleButtonClick = (action: "verify" | "reject") => {
    setConfirmAction(action);
  };

  const handleCancel = () => {
    setConfirmAction(null);
  };

  // Idle state: show action buttons
  if (!confirmAction) {
    return (
      <div className="space-y-3">
        {state.error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-sm text-red-700">{state.error}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleButtonClick("verify")}
            className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            ✓ Verify {entityType}
          </button>
          <button
            type="button"
            onClick={() => handleButtonClick("reject")}
            className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            ✕ Reject {entityType}
          </button>
        </div>
      </div>
    );
  }

  // Confirm state: show confirmation dialog with notes
  return (
    <form action={dispatch} className="space-y-4">
      <input type="hidden" name="entity_id" value={entityId} />
      <input type="hidden" name="action" value={confirmAction} />

      <div
        className={`rounded-lg border-2 p-4 ${
          confirmAction === "verify"
            ? "border-green-300 bg-green-50"
            : "border-red-300 bg-red-50"
        }`}
      >
        <p className="text-sm font-medium text-gray-900">
          {confirmAction === "verify"
            ? `Are you sure you want to verify this ${entityType}?`
            : `Are you sure you want to reject this ${entityType}?`}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {confirmAction === "verify"
            ? `This will mark the ${entityType} as verified and allow it to be publicly visible.`
            : `This will mark the ${entityType} as rejected. The owner will be notified.`}
        </p>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="notes"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Notes{" "}
          {confirmAction === "reject" && (
            <span className="text-xs text-red-500">(required)</span>
          )}
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder={
            confirmAction === "verify"
              ? "Optional notes…"
              : "Reason for rejection…"
          }
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {/* Error message */}
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-colors ${
            confirmAction === "verify"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {isPending
            ? "Processing…"
            : confirmAction === "verify"
              ? "Confirm Verification"
              : "Confirm Rejection"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
