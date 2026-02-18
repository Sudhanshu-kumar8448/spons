import type { ReactNode } from "react";

// ─── Props ─────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  /** Heading text */
  title: string;
  /** Descriptive text explaining the action */
  description: string;
  /** Visual variant — controls border / background tint */
  variant?: "danger" | "warning" | "success";
  /** Optional warning callout below the description */
  warning?: string;
  /** Additional content (e.g. form fields) rendered inside the dialog */
  children?: ReactNode;
}

const variantClasses = {
  danger: "border-red-500/30 bg-red-500/10",
  warning: "border-amber-500/30 bg-amber-500/10",
  success: "border-emerald-500/30 bg-emerald-500/10",
};

/**
 * Styled confirmation card for dangerous / important actions.
 *
 * Does NOT include buttons — the caller wraps this inside a `<form>`
 * with its own submit / cancel buttons.
 *
 * Server Component safe.
 */
export default function ConfirmDialog({
  title,
  description,
  variant = "danger",
  warning,
  children,
}: ConfirmDialogProps) {
  return (
    <div className={`animate-fade-in rounded-2xl border-2 p-4 ${variantClasses[variant]}`}>
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
      {warning && (
        <p className="mt-2 text-xs font-semibold text-red-400">
          ⚠ {warning}
        </p>
      )}
      {children}
    </div>
  );
}
