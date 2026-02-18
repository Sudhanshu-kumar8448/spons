import type { ReactNode } from "react";

// ─── Props ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  /** Icon or emoji displayed prominently (default: 📭) */
  icon?: ReactNode;
  /** Primary heading (e.g. "No results found") */
  heading: string;
  /** Optional subtitle with additional context */
  description?: string;
  /** Optional CTA (link or button) */
  action?: ReactNode;
}

/**
 * Generic empty state for lists / tables with no data.
 *
 * - Server Component safe
 * - Zero domain knowledge
 */
export default function EmptyState({
  icon = "📭",
  heading,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 py-16">
      <span className="text-5xl">{icon}</span>
      <h2 className="mt-4 text-lg font-semibold text-white">{heading}</h2>
      {description && (
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
