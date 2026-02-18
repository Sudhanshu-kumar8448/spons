import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ─── Props ─────────────────────────────────────────────────────────────

interface PaginationProps {
  /** Current page (1-indexed) */
  page: number;
  /** Total number of items across all pages */
  total: number;
  /** Items per page */
  pageSize: number;
  /**
   * Build the href for a given page number.
   * Caller is responsible for preserving existing query params.
   */
  buildHref: (page: number) => string;
  /** Show "Page X of Y" label (default: true) */
  showPageLabel?: boolean;
}

/**
 * Generic pagination bar with Previous / Next links.
 *
 * - Server Component safe
 * - Does not fetch or know about data domains
 * - Uses `<Link>` for instant client-side navigation
 */
export default function Pagination({
  page,
  total,
  pageSize,
  buildHref,
  showPageLabel = true,
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 px-6 py-3">
      {showPageLabel ? (
        <p className="text-sm text-slate-400">
          Page {page} of {totalPages}
        </p>
      ) : (
        <span />
      )}

      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={buildHref(page - 1)}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={buildHref(page + 1)}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
