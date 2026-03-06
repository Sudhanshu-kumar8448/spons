"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

type ProposalStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_MANAGER_REVIEW"
  | "FORWARDED_TO_ORGANIZER"
  | "APPROVED"
  | "REJECTED"
  | "REQUEST_CHANGES"
  | "WITHDRAWN";

interface TierOption {
  id: string;
  tierType: string;
  askingPrice: number;
}

interface ProposalReviewFormProps {
  proposalId: string;
  currentStatus: ProposalStatus;
  initialAmount?: number | null;
  initialTier?: string | null;
  initialNotes?: string | null;
  tiers: TierOption[];
}

export default function ProposalReviewForm({
  proposalId,
  currentStatus,
  initialAmount,
  initialTier,
  initialNotes,
  tiers,
}: ProposalReviewFormProps) {
  const router = useRouter();
  const [proposedAmount, setProposedAmount] = useState(initialAmount ?? "");
  const [proposedTier, setProposedTier] = useState(initialTier ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isReviewable =
    currentStatus === "SUBMITTED" || currentStatus === "UNDER_MANAGER_REVIEW";

  const handleAction = useCallback(
    async (action: string) => {
      setLoading(action);
      setError(null);
      setSuccess(null);

      const payload: Record<string, unknown> = {};

      if (proposedAmount !== "" && proposedAmount !== null) {
        payload.proposedAmount = Number(proposedAmount);
      }
      if (proposedTier) {
        payload.proposedTier = proposedTier;
      }
      if (notes) {
        payload.notes = notes;
      }

      if (action === "forward") {
        payload.status = "FORWARDED_TO_ORGANIZER";
      } else if (action === "reject") {
        payload.status = "REJECTED";
      } else if (action === "request_changes") {
        payload.status = "REQUEST_CHANGES";
      } else if (action === "save") {
        payload.status = "UNDER_MANAGER_REVIEW";
      }

      try {
        await apiClient.patch(`/manager/proposals/${proposalId}`, payload);
        const labels: Record<string, string> = {
          save: "Draft saved",
          forward: "Proposal forwarded to organizer",
          reject: "Proposal rejected",
          request_changes: "Changes requested from sponsor",
        };
        setSuccess(labels[action] || "Updated successfully");
        router.refresh();
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "Failed to update proposal";
        setError(msg);
      } finally {
        setLoading(null);
      }
    },
    [proposalId, proposedAmount, proposedTier, notes, router],
  );

  return (
    <div className="space-y-6">
      {/* Feedback messages */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="proposedAmount"
            className="text-xs font-medium uppercase tracking-wider text-gray-500"
          >
            Proposed Amount ($)
          </label>
          <input
            type="number"
            id="proposedAmount"
            value={proposedAmount}
            onChange={(e) => setProposedAmount(e.target.value)}
            disabled={!isReviewable || !!loading}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
          />
        </div>
        <div>
          <label
            htmlFor="proposedTier"
            className="text-xs font-medium uppercase tracking-wider text-gray-500"
          >
            Target Tier
          </label>
          <select
            id="proposedTier"
            value={proposedTier}
            onChange={(e) => setProposedTier(e.target.value)}
            disabled={!isReviewable || !!loading}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
          >
            <option value="">Select Tier...</option>
            {tiers.map((t) => (
              <option key={t.id} value={t.tierType}>
                {t.tierType} (${Number(t.askingPrice).toLocaleString()})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="text-xs font-medium uppercase tracking-wider text-gray-500"
        >
          Manager Review Notes
        </label>
        <textarea
          id="notes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={!isReviewable || !!loading}
          placeholder="Add internal notes or instructions for the organizer..."
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
        />
      </div>

      {isReviewable && (
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            disabled={!!loading}
            onClick={() => handleAction("save")}
            className="inline-flex justify-center items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading === "save" ? (
              <Spinner />
            ) : null}
            Save Draft
          </button>
          <button
            type="button"
            disabled={!!loading}
            onClick={() => handleAction("request_changes")}
            className="inline-flex justify-center items-center rounded-md border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700 shadow-sm hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading === "request_changes" ? (
              <Spinner />
            ) : null}
            Request Changes from Sponsor
          </button>
          <div className="flex-1" />
          <button
            type="button"
            disabled={!!loading}
            onClick={() => handleAction("reject")}
            className="inline-flex justify-center items-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading === "reject" ? (
              <Spinner />
            ) : null}
            Reject Proposal
          </button>
          <button
            type="button"
            disabled={!!loading}
            onClick={() => handleAction("forward")}
            className="inline-flex justify-center items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading === "forward" ? (
              <Spinner />
            ) : null}
            Approve &amp; Forward to Organizer
          </button>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="mr-2 h-4 w-4 animate-spin text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
