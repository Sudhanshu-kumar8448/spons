import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerUser } from "@/lib/auth";
import { UserRole } from "@/lib/types/roles";
import { fetchEventLifecycle } from "@/lib/manager-api";
import { fetchBrowsableEventById } from "@/lib/sponsor-api";
import type { EventLifecycleResponse } from "@/lib/types/manager";
import type { BrowsableEvent } from "@/lib/types/sponsor";
import OrganizerEventDetail from "@/components/organizer/OrganizerEventDetail";
import LifecycleProgressBar from "@/components/manager/LifecycleProgressBar";
import LifecycleTimeline from "@/components/manager/LifecycleTimeline";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  const { id } = await params;
  const user = await getServerUser();

  // Manager role → show full event lifecycle (timeline, progress, etc)
  if (user?.role === UserRole.MANAGER) {
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
    const endDate = new Date(event.endDate).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    // Verification status badge colors
    const verificationBadge: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: "bg-yellow-100", text: "text-yellow-700" },
      VERIFIED: { bg: "bg-green-100", text: "text-green-700" },
      REJECTED: { bg: "bg-red-100", text: "text-red-700" },
    };
    const vBadge = verificationBadge[event.verificationStatus] ?? verificationBadge.PENDING;
    // Event status badge
    const statusBadge: Record<string, { bg: string; text: string }> = {
      DRAFT: { bg: "bg-gray-100", text: "text-gray-600" },
      PUBLISHED: { bg: "bg-blue-100", text: "text-blue-700" },
      CANCELLED: { bg: "bg-red-100", text: "text-red-700" },
      COMPLETED: { bg: "bg-green-100", text: "text-green-700" },
    };
    const sBadge = statusBadge[event.status] ?? statusBadge.DRAFT;
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          ← Back to events
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

  // Organizer role → their own event detail
  if (user?.role === UserRole.ORGANIZER) {
    return <OrganizerEventDetail id={id} />;
  }

  // Default: Sponsor browsable event detail
  let event: BrowsableEvent;
  try {
    event = await fetchBrowsableEventById(id);
  } catch {
    notFound();
  }

  const startDate = new Date(event.start_date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const endDate = new Date(event.end_date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard/events"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        ← Back to events
      </Link>

      {/* Hero image */}
      {event.image_url && (
        <div className="aspect-[21/9] overflow-hidden rounded-xl bg-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.image_url}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {event.category && (
            <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {event.category}
            </span>
          )}

          <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
          <p className="whitespace-pre-line text-gray-600">
            {event.description}
          </p>

          {event.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Sponsorship tiers */}
          {event.sponsorship_tiers.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Sponsorship Tiers
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {event.sponsorship_tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="rounded-xl border border-gray-200 bg-white p-5"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">
                        {tier.name}
                      </h3>
                      <span className="text-sm font-bold text-blue-600">
                        {tier.currency} {tier.amount.toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {tier.description}
                    </p>
                    {tier.benefits && tier.benefits.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {tier.benefits.map((b, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-xs text-gray-600"
                          >
                            <span className="mt-0.5 text-green-500">✓</span>
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-3 text-xs text-gray-400">
                      {tier.slots_available} slot
                      {tier.slots_available !== 1 ? "s" : ""} available
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Event Details
            </h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="font-medium text-gray-700">Start</dt>
                <dd className="text-gray-600">{startDate}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700">End</dt>
                <dd className="text-gray-600">{endDate}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700">Location</dt>
                <dd className="text-gray-600">{event.location}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700">Expected Footfall</dt>
                <dd className="text-gray-600">
                  {event.expected_footfall.toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Organizer card */}
          {event.organizer && (
            <div className="rounded-xl bg-white p-6 shadow">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Organizer
              </h2>
              <div className="mt-4 flex items-center gap-3">
                {event.organizer.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.organizer.logo_url}
                    alt={event.organizer.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-500">
                    {event.organizer.name.charAt(0)}
                  </span>
                )}
                <span className="font-medium text-gray-900">
                  {event.organizer.name}
                </span>
              </div>
            </div>
          )}

          {/* CTA */}
          <Link
            href={`/dashboard/proposals/new?event_id=${event.id}`}
            className="block w-full rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Send a Proposal
          </Link>
        </aside>
      </div>
    </div>
  );
}
