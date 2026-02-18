import { Search } from "lucide-react";
import type { ReactNode } from "react";

// ─── Props ─────────────────────────────────────────────────────────────

interface SearchBarProps {
  /** Current search value (for `defaultValue`) */
  defaultValue?: string;
  /** Placeholder text */
  placeholder?: string;
  /**
   * Accent colour key (e.g. "red", "amber", "green").
   * Controls focus ring and submit button colours.
   * Default: "blue"
   */
  color?: string;
  /**
   * Additional hidden fields to preserve existing query params.
   * Rendered as `<input type="hidden" name={key} value={value} />`.
   */
  hiddenFields?: Record<string, string | undefined>;
  /** Optional extra content (e.g. a select dropdown) rendered after the input */
  children?: ReactNode;
}

/**
 * Generic search bar wrapped in a GET `<form>`.
 *
 * - Submits to the same page (no action needed)
 * - Preserves other query params via `hiddenFields`
 * - Server Component safe (stateless)
 */
export default function SearchBar({
  defaultValue,
  placeholder = "Search…",
  color = "blue",
  hiddenFields,
  children,
}: SearchBarProps) {
  return (
    <form className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            name="search"
            defaultValue={defaultValue}
            placeholder={placeholder}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {children}

        {/* Preserve existing query params */}
        {hiddenFields &&
          Object.entries(hiddenFields).map(
            ([key, value]) =>
              value && (
                <input key={key} type="hidden" name={key} value={value} />
              ),
          )}

        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all"
        >
          Search
        </button>
      </div>
    </form>
  );
}
