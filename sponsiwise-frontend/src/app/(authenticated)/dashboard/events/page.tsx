import Link from "next/link";
import {
  Calendar,
  MapPin,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { getServerUser } from "@/lib/auth";
import { UserRole } from "@/lib/types/roles";
import { fetchBrowsableEvents } from "@/lib/sponsor-api";
import type { BrowsableEvent } from "@/lib/types/sponsor";
import OrganizerEventsList from "@/components/organizer/OrganizerEventsList";
import EventVerificationList from "@/components/manager/EventVerificationList";

// ─── Event card ────────────────────────────────────────────────────────

function EventCard({ event }: { event: BrowsableEvent }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 transition-all duration-300 hover:border-slate-700 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/5">
      {/* Image / placeholder */}
      <div className="aspect-[16/9] w-full bg-slate-800 overflow-hidden">
        {event.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.image_url}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-600/20 to-sky-500/10">
            <Calendar className="h-10 w-10 text-blue-400/40" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {event.category && (
          <span className="mb-2 inline-block self-start rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400">
            {event.category}
          </span>
        )}

        <h3 className="text-lg font-semibold text-white">{event.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-400">
          {event.description}
        </p>

        <div className="mt-auto pt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {event.location}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />{" "}
            {new Date(event.start_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" /> {event.expected_footfall.toLocaleString()}
          </span>
        </div>

        {/* Tiers preview */}
        {event.sponsorship_tiers.length > 0 && (
          <div className="mt-3 border-t border-slate-800 pt-3">
            <p className="text-xs font-medium text-slate-500">
              {event.sponsorship_tiers.length} sponsorship{" "}
              {event.sponsorship_tiers.length === 1 ? "tier" : "tiers"}{" "}
              available
            </p>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <Link
            href={`/dashboard/events/${event.id}`}
            className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white transition-all"
          >
            View details
          </Link>
          <Link
            href={`/dashboard/proposals/new?event_id=${event.id}`}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
          >
            Send proposal
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Search className="h-12 w-12 text-slate-600" />
      <h2 className="mt-4 text-lg font-semibold text-white">
        No events found
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        There are no events available for sponsorship at the moment.
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle className="h-12 w-12 text-red-400" />
      <h2 className="mt-4 text-lg font-semibold text-white">
        Something went wrong
      </h2>
      <p className="mt-1 text-sm text-slate-400">{message}</p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────

interface BrowseEventsPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    search?: string;
    verification_status?: string;
  }>;
}

export default async function EventsPage({
  searchParams,
}: BrowseEventsPageProps) {
  const params = await searchParams;
  const user = await getServerUser();

  // Manager role → event verification queue
  if (user?.role === UserRole.MANAGER) {
    return <EventVerificationList searchParams={params} />;
  }

  // Organizer role → their own events
  if (user?.role === UserRole.ORGANIZER) {
    return <OrganizerEventsList searchParams={params} />;
  }

  // Default: Sponsor browsable events
  const page = Number(params.page) || 1;
  const category = params.category;
  const search = params.search;

  let events: BrowsableEvent[] = [];
  let total = 0;
  let error: string | null = null;

  try {
    const res = await fetchBrowsableEvents({
      page,
      page_size: 12,
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Browse Events</h1>
        <p className="mt-1 text-sm text-slate-400">
          Find events to sponsor and submit proposals.
        </p>
      </div>

      {/* Filters */}
      <form
        method="GET"
        className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4"
      >
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="search"
            className="mb-1 block text-xs font-medium text-slate-400"
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
              className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="min-w-[160px]">
          <label
            htmlFor="category"
            className="mb-1 block text-xs font-medium text-slate-400"
          >
            Category
          </label>
          <input
            id="category"
            name="category"
            type="text"
            defaultValue={category ?? ""}
            placeholder="e.g. Tech, Sports…"
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all"
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
            Showing {events.length} of {total} events
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {/* Pagination */}
          {total > 12 && (
            <div className="flex justify-center gap-4 pt-4">
              {page > 1 && (
                <Link
                  href={`/dashboard/events?page=${page - 1}${category ? `&category=${category}` : ""}${search ? `&search=${search}` : ""}`}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white transition-all"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Link>
              )}
              {page * 12 < total && (
                <Link
                  href={`/dashboard/events?page=${page + 1}${category ? `&category=${category}` : ""}${search ? `&search=${search}` : ""}`}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white transition-all"
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
