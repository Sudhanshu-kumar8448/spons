import type { ButtonHTMLAttributes, ReactNode } from "react";

// ─── Variant types ─────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

// ─── Props ─────────────────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant (default: "primary") */
  variant?: ButtonVariant;
  /** Size preset (default: "md") */
  size?: ButtonSize;
  /**
   * Primary colour class prefix — e.g. "red", "green", "amber".
   * Only affects the `primary` variant. Default: "blue".
   */
  color?: string;
  /** Show a loading state */
  loading?: boolean;
  /** Optional leading icon */
  icon?: ReactNode;
  children: ReactNode;
}

// ─── Style maps ────────────────────────────────────────────────────────

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

function variantClasses(variant: ButtonVariant, color: string): string {
  switch (variant) {
    case "primary":
      return `bg-${color}-600 text-white hover:bg-${color}-700 focus:ring-${color}-500`;
    case "secondary":
      return "border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white focus:ring-slate-500";
    case "danger":
      return "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500";
    case "ghost":
      return "text-slate-400 hover:bg-slate-800 hover:text-white focus:ring-slate-500";
  }
}

/**
 * Generic button with variant, size, colour, and loading support.
 *
 * Works as both a submit button inside `<form action={…}>` and as
 * an interactive button in Client Components.
 *
 * - No business logic
 * - Colour-agnostic — configured via `color` prop
 */
export default function Button({
  variant = "primary",
  size = "md",
  color = "blue",
  loading = false,
  icon,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses[size]} ${variantClasses(variant, color)} ${className ?? ""}`}
      {...rest}
    >
      {loading ? (
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
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
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
