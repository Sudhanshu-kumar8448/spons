import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerUser } from "@/lib/auth";
import { UserRole } from "@/lib/types/roles";
import { fetchEventLifecycle } from "@/lib/manager-api";
import type { EventLifecycleResponse } from "@/lib/types/manager";
import LifecycleProgressBar from "@/components/manager/LifecycleProgressBar";
import LifecycleTimeline from "@/components/manager/LifecycleTimeline";

/**
 * /dashboard/events/[id]/lifecycle
 *
 * Manager-only page: full lifecycle view of an event.
 *
 * Server Component — fetches data via authFetch, renders:
 *  - Event header (title, organizer, status badges)
 *  - Progress bar
 *  - Vertical timeline of all actions
 *
 * ──────────────────────────────────────────────────────────────────────
 * TEST SCENARIOS
 * ──────────────────────────────────────────────────────────────────────
 *
 * Case 1:
 *   - Event created, no proposals, not verified
 *   - Expected: Progress low (~50%), only EVENT_CREATED in timeline
 *
 * Case 2:
 *   - Event verified, 2 proposals submitted, 1 approved, emails sent
 *   - Expected: High progress %, green badges, email entries with recipients
 *
 * Case 3:
 *   - Email failed
 *   - Expected: Timeline shows EMAIL_FAILED in red, progress bar has red indicator
 *
 * Case 4:
 *   - Multiple proposals
 *   - Expected: Deduplicated timeline entries, each proposal distinct
 */

interface LifecyclePageProps {
  params: Promise<{ id: string }>;
}

export default async function EventLifecyclePage({
  params,
}: LifecyclePageProps) {
  const { id } = await params;
  const user = await getServerUser();

  // Only managers can view lifecycle
  if (!user || user.role !== UserRole.MANAGER) {
    notFound();
  }

  let data: EventLifecycleResponse;
  try {
    data = await fetchEventLifecycle(id);
  } catch {
    notFound();
  }

  const { event, proposals, progress, timeline } = data;

  const hasFailed = timeline.some((t) => t.type === "EMAIL_FAILED");

  const startDate = new Date(event.startDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Verification status badge colors
  const verificationBadge: Record<string, { bg: string; text: string }> = {
    PENDING:  { bg: "bg-yellow-100", text: "text-yellow-700" },
    VERIFIED: { bg: "bg-green-100",  text: "text-green-700" },
    REJECTED: { bg: "bg-red-100",    text: "text-red-700" },
  };
  const vBadge = verificationBadge[event.verificationStatus] ?? verificationBadge.PENDING;

  // Event status badge
  const statusBadge: Record<string, { bg: string; text: string }> = {
    DRAFT:     { bg: "bg-gray-100",   text: "text-gray-600" },
    PUBLISHED: { bg: "bg-blue-100",   text: "text-blue-700" },
    CANCELLED: { bg: "bg-red-100",    text: "text-red-700" },
    COMPLETED: { bg: "bg-green-100",  text: "text-green-700" },
  };
  const sBadge = statusBadge[event.status] ?? statusBadge.DRAFT;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/dashboard/events/${id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        ← Back to event
      </Link>

      {/* ─── Event header ──────────────────────────────────────────── */}
      <div className="rounded-xl bg-white p-6 shadow">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              {event.organizer.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.organizer.logoUrl}
                  alt={event.organizer.name}
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-500">
                  {event.organizer.name.charAt(0)}
                </span>
              )}
              <span>{event.organizer.name}</span>
              {event.location && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>📍 {event.location}</span>
                </>
              )}
              <span className="text-gray-300">·</span>
              <span>🗓 {startDate}</span>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${vBadge.bg} ${vBadge.text}`}
            >
              {event.verificationStatus}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sBadge.bg} ${sBadge.text}`}
            >
              {event.status}
            </span>
          </div>
        </div>

        {/* Proposals summary */}
        {proposals.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
              Proposals ({proposals.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {proposals.map((p) => {
                const pColor: Record<string, string> = {
                  APPROVED: "bg-green-100 text-green-700",
                  REJECTED: "bg-red-100 text-red-700",
                  SUBMITTED: "bg-yellow-100 text-yellow-700",
                  UNDER_REVIEW: "bg-blue-100 text-blue-700",
                  DRAFT: "bg-gray-100 text-gray-600",
                  WITHDRAWN: "bg-gray-100 text-gray-500",
                };
                return (
                  <span
                    key={p.id}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${pColor[p.status] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {p.sponsorship.company.name}
                    <span className="opacity-60">·</span>
                    {p.status}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── Progress bar ──────────────────────────────────────────── */}
      <LifecycleProgressBar progress={progress} hasFailed={hasFailed} />

      {/* ─── Timeline ──────────────────────────────────────────────── */}
      <LifecycleTimeline timeline={timeline} />
    </div>
  );
}
