import Link from "next/link";

// ─── Tab definition ────────────────────────────────────────────────────

export interface FilterTab {
  /** Unique key and query-param value */
  value: string;
  /** Display label */
  label: string;
}

// ─── Props ─────────────────────────────────────────────────────────────

interface FilterTabsProps {
  /** Available tabs */
  tabs: FilterTab[];
  /** Currently active tab value */
  activeValue: string;
  /** Build href for a tab; caller preserves other query params */
  buildHref: (value: string) => string;
  /** Tailwind colour class for the active pill (e.g. "bg-blue-600") */
  activeColor?: string;
}

/**
 * Generic filter pill tabs.
 *
 * - Server Component safe
 * - The caller defines what the tabs mean and where they link
 * - Renders pill links as a Fragment — caller provides the flex wrapper
 */
export default function FilterTabs({
  tabs,
  activeValue,
  buildHref,
  activeColor = "bg-blue-600",
}: FilterTabsProps) {
  return (
    <>
      {tabs.map((tab) => {
        const isActive = tab.value === activeValue;
        return (
          <Link
            key={tab.value}
            href={buildHref(tab.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${isActive
                ? `${activeColor} text-white shadow-lg`
                : "border border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-white"
              }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </>
  );
}
