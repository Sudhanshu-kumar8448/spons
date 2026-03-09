"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Rocket,
  Calendar,
  MapPin,
  Users,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface EventItem {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: string;
  verification_status: string;
  expected_footfall?: number;
  category?: string;
  location?: string;
  organizer?: {
    id: string;
    name: string;
  };
  sponsorship_tiers_summary?: {
    total_tiers: number;
    total_slots: number;
    sold_slots: number;
    available_slots: number;
  };
}

interface EventsResponse {
  data: EventItem[];
  total: number;
  page: number;
  page_size: number;
}

const PAGE_SIZE = 12;

/* ─── Helpers ────────────────────────────────────────────────────────── */

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ─── Component ──────────────────────────────────────────────────────── */

export default function PublishEventsList() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("page_size", String(PAGE_SIZE));
      qs.set("status", "VERIFIED");
      if (debouncedSearch) qs.set("search", debouncedSearch);
      const res = await apiClient.get<EventsResponse>(
        `/manager/events?${qs.toString()}`
      );
      setEvents(res.data);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.message || "Failed to load events.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  async function handlePublish(eventId: string, title: string) {
    setPublishingId(eventId);
    setSuccessMsg(null);
    setError(null);
    try {
      await apiClient.post(`/manager/events/${eventId}/publish`, {});
      setSuccessMsg(`"${title}" has been published successfully!`);
      // Remove from list since it's no longer VERIFIED
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      setTotal((prev) => prev - 1);
    } catch (err: any) {
      setError(err?.message || "Failed to publish event.");
    } finally {
      setPublishingId(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h2 className="text-2xl font-bold text-white">Publish Events</h2>
        <p className="mt-1 text-sm text-slate-400">
          Verified events ready to be published · {total} total
        </p>
      </div>

      {/* ── Success Banner ── */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
          <p className="text-sm text-emerald-300">{successMsg}</p>
          <button
            onClick={() => setSuccessMsg(null)}
            className="ml-auto text-emerald-400 hover:text-emerald-300"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
          <XCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events…"
          className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-11 pr-4 text-sm text-white placeholder-slate-500 transition-colors focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && events.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10">
            <Rocket className="h-7 w-7 text-purple-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">
            No events to publish
          </h3>
          <p className="mt-1 max-w-sm text-center text-sm text-slate-400">
            All verified events have been published, or there are no verified
            events yet.
          </p>
        </div>
      )}

      {/* ── Event Cards ── */}
      {!loading && events.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition-all hover:border-slate-700"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Left: Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-white truncate">
                      {event.title}
                    </h3>
                    <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                      Verified
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    {event.organizer?.name && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {event.organizer.name}
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(event.start_date)} — {formatDate(event.end_date)}
                    </span>
                    {event.expected_footfall != null && event.expected_footfall > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {event.expected_footfall.toLocaleString("en-IN")} expected
                      </span>
                    )}
                  </div>

                  {event.category && (
                    <span className="mt-2 inline-block rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                      {event.category.replace(/_/g, " ")}
                    </span>
                  )}
                </div>

                {/* Right: Publish Button */}
                <button
                  onClick={() => handlePublish(event.id, event.title)}
                  disabled={publishingId !== null}
                  className={`shrink-0 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                    publishingId === event.id
                      ? "cursor-not-allowed bg-slate-800 text-slate-500"
                      : publishingId !== null
                        ? "cursor-not-allowed bg-slate-800/50 text-slate-600"
                        : "bg-gradient-to-r from-purple-600 to-violet-500 text-white shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-0.5"
                  }`}
                >
                  {publishingId === event.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publishing…
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4" />
                      Publish
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3">
          <p className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
