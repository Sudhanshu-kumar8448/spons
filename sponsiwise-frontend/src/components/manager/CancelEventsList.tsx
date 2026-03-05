"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Ban,
  Calendar,
  MapPin,
  Users,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
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
}

interface EventsResponse {
  data: EventItem[];
  total: number;
  page: number;
  page_size: number;
}

const PAGE_SIZE = 12;

/* ─── Status tab config ──────────────────────────────────────────────── */

const STATUS_TABS = [
  { value: "PUBLISHED", label: "Published" },
  { value: "VERIFIED", label: "Verified" },
  { value: "UNDER_MANAGER_REVIEW", label: "Under Review" },
];

/* ─── Helpers ────────────────────────────────────────────────────────── */

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statusBadge: Record<string, string> = {
  published: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  verified: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  under_manager_review: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  draft: "border-slate-500/30 bg-slate-500/10 text-slate-400",
};

/* ─── Component ──────────────────────────────────────────────────────── */

export default function CancelEventsList() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState("PUBLISHED");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancel modal state
  const [cancelTarget, setCancelTarget] = useState<EventItem | null>(null);
  const [cancelNotes, setCancelNotes] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on search or tab change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeTab]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("page_size", String(PAGE_SIZE));
      qs.set("status", activeTab);
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
  }, [page, debouncedSearch, activeTab]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  function openCancelModal(event: EventItem) {
    setCancelTarget(event);
    setCancelNotes("");
    setCancelError("");
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    if (!cancelNotes.trim() || cancelNotes.trim().length < 5) {
      setCancelError("Please provide a reason (at least 5 characters).");
      return;
    }
    setCancelError("");
    setCancellingId(cancelTarget.id);
    setError(null);
    try {
      await apiClient.post(`/manager/events/${cancelTarget.id}/cancel`, {
        action: "reject",
        notes: cancelNotes.trim(),
      });
      setSuccessMsg(`"${cancelTarget.title}" has been cancelled.`);
      setCancelTarget(null);
      setCancelNotes("");
      // Remove from list
      setEvents((prev) => prev.filter((e) => e.id !== cancelTarget.id));
      setTotal((prev) => prev - 1);
    } catch (err: any) {
      setCancelError(err?.message || "Failed to cancel event.");
    } finally {
      setCancellingId(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h2 className="text-2xl font-bold text-white">Cancel Events</h2>
        <p className="mt-1 text-sm text-slate-400">
          Cancel events that are no longer needed · {total} total
        </p>
      </div>

      {/* ── Success Banner ── */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
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

      {/* ── Status Tabs ── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.value
                ? "bg-red-600 text-white shadow-lg shadow-red-500/20"
                : "border border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events…"
          className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-11 pr-4 text-sm text-white placeholder-slate-500 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-red-500" />
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && events.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
            <Ban className="h-7 w-7 text-red-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">
            No events found
          </h3>
          <p className="mt-1 max-w-sm text-center text-sm text-slate-400">
            No cancellable events matching your current filter.
          </p>
        </div>
      )}

      {/* ── Event Cards ── */}
      {!loading && events.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {events.map((event) => {
            const st = (event.status || "").toLowerCase();
            return (
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
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                          statusBadge[st] || statusBadge.draft
                        }`}
                      >
                        {st.replace(/_/g, " ")}
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
                        {formatDate(event.start_date)} —{" "}
                        {formatDate(event.end_date)}
                      </span>
                    </div>

                    {event.category && (
                      <span className="mt-2 inline-block rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                        {event.category.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>

                  {/* Right: Cancel Button */}
                  <button
                    onClick={() => openCancelModal(event)}
                    disabled={cancellingId !== null}
                    className={`shrink-0 inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all ${
                      cancellingId !== null
                        ? "cursor-not-allowed border-slate-700 bg-slate-800/50 text-slate-600"
                        : "border-red-500/30 bg-red-500/10 text-red-400 hover:border-red-500/50 hover:bg-red-500/20"
                    }`}
                  >
                    <Ban className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              </div>
            );
          })}
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

      {/* ── Cancel Confirmation Modal ── */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Cancel Event
                </h3>
                <p className="text-xs text-slate-400">
                  {cancelTarget.title}
                </p>
              </div>
            </div>

            <p className="mb-4 text-sm text-slate-400">
              This action cannot be undone. Please provide a reason for
              cancellation.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Cancellation Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={cancelNotes}
                  onChange={(e) => {
                    setCancelNotes(e.target.value);
                    if (cancelError) setCancelError("");
                  }}
                  placeholder="Explain why this event is being cancelled…"
                  rows={4}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                />
                {cancelError && (
                  <p className="mt-1 text-xs font-medium text-red-400">
                    {cancelError}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setCancelTarget(null);
                    setCancelNotes("");
                    setCancelError("");
                  }}
                  disabled={cancellingId !== null}
                  className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:opacity-50"
                >
                  Go Back
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancellingId !== null}
                  className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    cancellingId !== null
                      ? "cursor-not-allowed bg-slate-800 text-slate-500"
                      : "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20"
                  }`}
                >
                  {cancellingId !== null ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cancelling…
                    </>
                  ) : (
                    <>
                      <Ban className="h-4 w-4" />
                      Confirm Cancel
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
