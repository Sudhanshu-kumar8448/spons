import type { SelectHTMLAttributes } from "react";

// ─── Option definition ─────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

// ─── Props ─────────────────────────────────────────────────────────────

interface SelectFieldProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  /** Field label text */
  label: string;
  /** Select name (also used as htmlFor) */
  name: string;
  /** Dropdown options */
  options: SelectOption[];
  /** Error message beneath the select */
  error?: string;
  /** Hint text shown below the label */
  hint?: string;
  /** Placeholder shown as first disabled option */
  placeholder?: string;
  /** Accent colour stop for focus ring (default: "blue-500") */
  accentColor?: string;
}

/**
 * Generic select dropdown with label, hint, and error display.
 *
 * - Server Component safe (stateless)
 * - Pairs with Server Actions via `name` attribute
 */
export default function SelectField({
  label,
  name,
  options,
  error,
  hint,
  placeholder,
  accentColor = "blue-500",
  className,
  ...rest
}: SelectFieldProps) {
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

      <select
        id={name}
        name={name}
        className={`mt-1 block w-full rounded-xl border px-3 py-2 text-sm text-white bg-slate-800 transition-colors ${error
            ? "border-red-500/50 focus:border-red-500 focus:ring-red-500"
            : `border-slate-700 focus:border-${accentColor} focus:ring-${accentColor}`
          } focus:outline-none focus:ring-1`}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
