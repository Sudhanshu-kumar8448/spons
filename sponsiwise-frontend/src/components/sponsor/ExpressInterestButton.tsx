"use client";

import { useState, useTransition } from "react";
import { expressInterest } from "@/lib/sponsor-api";

interface ExpressInterestButtonProps {
  eventId: string;
  gradient: string;
}

export function ExpressInterestButton({
  eventId,
  gradient,
}: ExpressInterestButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    alreadyExpressed?: boolean;
  } | null>(null);

  function handleClick() {
    startTransition(async () => {
      try {
        const res = await expressInterest(eventId);
        setResult({
          success: true,
          message: res.message,
          alreadyExpressed: res.already_expressed,
        });
      } catch (err) {
        setResult({
          success: false,
          message:
            err instanceof Error
              ? err.message
              : "Failed to express interest. Please try again.",
        });
      }
    });
  }

  if (result?.success) {
    return (
      <div className="rounded-xl border border-emerald-800 bg-emerald-900/30 px-4 py-3.5 text-center">
        <p className="text-sm font-semibold text-emerald-400">
          {result.alreadyExpressed
            ? "You've already expressed interest in this event"
            : "Interest expressed successfully!"}
        </p>
        <p className="mt-1 text-xs text-emerald-500/80">
          The organizer and our team have been notified.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${gradient} px-4 py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        {isPending ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
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
            Expressing Interest…
          </>
        ) : (
          <>
            Express Interest
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </>
        )}
      </button>
      {result && !result.success && (
        <p className="text-xs text-red-400 text-center">{result.message}</p>
      )}
    </div>
  );
}
