import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { fetchBrowsableEvents } from "@/lib/sponsor-api";
import type { BrowsableEvent, EventCategory } from "@/lib/types/sponsor";
import { EventCard } from "@/components/sponsor_event_comp";

/* ─── Category filter options ───────────────────────────── */

const CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: "TECHNOLOGY", label: "Technology" },
  { value: "MUSIC_ENTERTAINMENT", label: "Music & Entertainment" },
  { value: "BUSINESS", label: "Business" },
  { value: "EDUCATION", label: "Education" },
  { value: "SPORTS", label: "Sports" },
  { value: "CULTURAL", label: "Cultural" },
  { value: "ART_CREATIVE", label: "Art & Creative" },
  { value: "LIFESTYLE", label: "Lifestyle" },
  { value: "GOVERNMENT_CIVIC", label: "Government & Civic" },
  { value: "TRAVEL_TOURISM", label: "Travel & Tourism" },
  { value: "AGRICULTURE_FARM", label: "Agriculture & Rural" },
  { value: "REAL_ESTATE", label: "Real Estate" },
  { value: "ENVIRONMENTAL_SUSTAINABILITY", label: "Sustainability" },
  { value: "OTHER", label: "Other" },
];

const PAGE_SIZE = 12;

/* ─── Empty / Error states ──────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="rounded-2xl bg-slate-800/50 p-6">
        <Sparkles className="h-12 w-12 text-slate-600" />
      </div>
      <h2 className="mt-6 text-xl font-bold text-white">No events found</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-400">
        There are no events available for sponsorship at the moment. Check back
        soon or adjust your filters.
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="rounded-2xl bg-red-500/10 p-6">
        <AlertCircle className="h-12 w-12 text-red-400" />
      </div>
      <h2 className="mt-6 text-xl font-bold text-white">
        Something went wrong
      </h2>
      <p className="mt-2 max-w-sm text-sm text-slate-400">{message}</p>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────── */

interface BrowseEventsPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    search?: string;
  }>;
}

export default async function BrowseEventsPage({
  searchParams,
}: BrowseEventsPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const category = params.category;
  const search = params.search;

  let events: BrowsableEvent[] = [];
  let total = 0;
  let error: string | null = null;

  try {
    const res = await fetchBrowsableEvents({
      page,
      page_size: PAGE_SIZE,
      category,
      search,
    });
    events = res.data;
    total = res.total;
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Unable to load events. Please try again later.";
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Browse Events
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Discover events to sponsor and express your interest.
        </p>
      </div>

      {/* Filters */}
      <form
        method="GET"
        className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur p-5"
      >
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="search"
            className="mb-1.5 block text-xs font-medium text-slate-400"
          >
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="search"
              name="search"
              type="text"
              defaultValue={search ?? ""}
              placeholder="Event name or keyword…"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Category dropdown */}
        <div className="min-w-[180px]">
          <label
            htmlFor="category"
            className="mb-1.5 block text-xs font-medium text-slate-400"
          >
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={category ?? ""}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all"
        >
          Search
        </button>
      </form>

      {/* Results */}
      {error ? (
        <ErrorState message={error} />
      ) : events.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-medium text-slate-300">{events.length}</span>{" "}
            of{" "}
            <span className="font-medium text-slate-300">{total}</span> events
          </p>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              {page > 1 && (
                <Link
                  href={`/brand/browseEvents?page=${page - 1}${category ? `&category=${category}` : ""}${search ? `&search=${search}` : ""}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white transition-all"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Link>
              )}

              <span className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>

              {page < totalPages && (
                <Link
                  href={`/brand/browseEvents?page=${page + 1}${category ? `&category=${category}` : ""}${search ? `&search=${search}` : ""}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white transition-all"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
