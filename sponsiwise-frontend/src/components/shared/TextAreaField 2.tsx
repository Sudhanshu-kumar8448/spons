import type { TextareaHTMLAttributes } from "react";

// ─── Props ─────────────────────────────────────────────────────────────

interface TextAreaFieldProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Field label text */
  label: string;
  /** Textarea name (also used as htmlFor) */
  name: string;
  /** Error message beneath the textarea */
  error?: string;
  /** Hint text shown below the label */
  hint?: string;
  /** Accent colour stop for focus ring (default: "blue-500") */
  accentColor?: string;
}

/**
 * Generic textarea field with label, hint, and error display.
 *
 * - Server Component safe (stateless)
 * - Pairs with Server Actions via `name` attribute
 */
export default function TextAreaField({
  label,
  name,
  error,
  hint,
  accentColor = "blue-500",
  className,
  ...rest
}: TextAreaFieldProps) {
  return (
    <div className={className}>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-slate-300"
      >
        {label}
      </label>

      {hint && (
        <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
      )}

      <textarea
        id={name}
        name={name}
        className={`mt-1 block w-full rounded-xl border px-3 py-2 text-sm text-white placeholder-slate-500 bg-slate-800 transition-colors ${error
            ? "border-red-500/50 focus:border-red-500 focus:ring-red-500"
            : `border-slate-700 focus:border-${accentColor} focus:ring-${accentColor}`
          } focus:outline-none focus:ring-1`}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        {...rest}
      />

      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
