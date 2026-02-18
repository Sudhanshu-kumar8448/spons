import Link from "next/link";
import { Calendar, MapPin, ChevronLeft, ChevronRight, Eye, FileText, Plus } from "lucide-react";
import { fetchOrganizerEvents } from "@/lib/organizer-api";
import type { OrganizerEvent } from "@/lib/types/organizer";

// ─── Event status badge ────────────────────────────────────────────────

const eventStatusConfig: Record<string, { label: string; className: string }> =
{
  draft: { label: "Draft", className: "bg-slate-500/10 text-slate-400" },
  published: { label: "Published", className: "bg-emerald-500/10 text-emerald-400" },
  cancelled: { label: "Cancelled", className: "bg-red-500/10 text-red-400" },
  completed: {
    label: "Completed",
    className: "bg-blue-500/10 text-blue-400",
  },
};

function EventStatusBadge({ status }: { status: string }) {
  const config = eventStatusConfig[status] ?? {
    label: status,
    className: "bg-slate-500/10 text-slate-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

// ─── Event card ────────────────────────────────────────────────────────

function OrganizerEventCard({ event }: { event: OrganizerEvent }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-blue-500/5">
      {/* Image / placeholder */}
      <div className="aspect-[16/9] w-full bg-slate-800">
        {event.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.image_url}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Calendar className="h-8 w-8 text-slate-600" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-2">
          <EventStatusBadge status={event.status} />
          {event.category && (
            <span className="inline-block rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              {event.category}
            </span>
          )}
        </div>

        <h3 className="text-lg font-semibold text-white">{event.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-400">
          {event.description}
        </p>

        <div className="mt-auto pt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {event.location}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(event.start_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Proposal summary */}
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-800 pt-3 text-center">
          <div>
            <p className="text-xs text-slate-500">Proposals</p>
            <p className="text-sm font-bold text-white">
              {event.total_proposals}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Pending</p>
            <p className="text-sm font-bold text-amber-400">
              {event.pending_proposals}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Revenue</p>
            <p className="text-sm font-bold text-emerald-400">
              {event.currency} {event.total_sponsorship_amount.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <Link
            href={`/dashboard/events/${event.id}`}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white transition-all"
          >
            <Eye className="h-3 w-3" /> View details
          </Link>
          <Link
            href={`/dashboard/proposals?event_id=${event.id}`}
            className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all"
          >
            <FileText className="h-3 w-3" /> Proposals
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Empty / error states ──────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 py-20 text-center">
      <Calendar className="h-12 w-12 text-slate-600" />
      <h2 className="mt-4 text-lg font-semibold text-white">
        No events yet
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        You haven&apos;t created any events. Get started by creating your first
        event.
      </p>
      <Link
        href="/dashboard/events/new"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5"
      >
        <Plus className="h-4 w-4" />
        Create Your First Event
      </Link>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 py-20 text-center">
      <span className="text-5xl">⚠️</span>
      <h2 className="mt-4 text-lg font-semibold text-white">
        Something went wrong
      </h2>
      <p className="mt-1 text-sm text-red-300">{message}</p>
    </div>
  );
}

// ─── Filter tabs ───────────────────────────────────────────────────────

const statusFilters = [
  { label: "All", value: "" },
  { label: "Published", value: "published" },
  { label: "Draft", value: "draft" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

// ─── Main component ────────────────────────────────────────────────────

interface OrganizerEventsListProps {
  searchParams: {
    page?: string;
    status?: string;
    search?: string;
  };
}

export default async function OrganizerEventsList({
  searchParams,
}: OrganizerEventsListProps) {
  const page = Number(searchParams.page) || 1;
  const statusFilter = searchParams.status ?? "";
  const search = searchParams.search;

  let events: OrganizerEvent[] = [];
  let total = 0;
  let error: string | null = null;

  try {
    const res = await fetchOrganizerEvents({
      page,
      page_size: 12,
      status: statusFilter || undefined,
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Events</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your events and track sponsorship activity.
          </p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="group inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 sm:self-center"
        >
          <Plus className="h-4 w-4" />
          Create Event
        </Link>
      </div>

      {/* Search + filters */}
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
          <input
            id="search"
            name="search"
            type="text"
            defaultValue={search ?? ""}
            placeholder="Event name or keyword…"
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="min-w-[160px]">
          <label
            htmlFor="status"
            className="mb-1 block text-xs font-medium text-slate-400"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={statusFilter}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {statusFilters.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
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
            Showing {events.length} of {total} event
            {total !== 1 ? "s" : ""}
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <OrganizerEventCard key={event.id} event={event} />
            ))}
          </div>

          {/* Pagination */}
          {total > 12 && (
            <div className="flex justify-center gap-4 pt-4">
              {page > 1 && (
                <Link
                  href={`/dashboard/events?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ""}${search ? `&search=${search}` : ""}`}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white transition-all"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Link>
              )}
              {page * 12 < total && (
                <Link
                  href={`/dashboard/events?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ""}${search ? `&search=${search}` : ""}`}
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
