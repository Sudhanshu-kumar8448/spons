import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchOrganizerEventById } from "@/lib/organizer-api";
import type { OrganizerEvent } from "@/lib/types/organizer";
import { DeliverableFillSection } from "@/components/organizer/DeliverableFill";
import { formatInr } from "@/lib/currency";
import {
  Calendar,
  MapPin,
  Users,
  ArrowLeft,
  Layers,
  Pencil,
  FileText,
  TrendingUp,
  Clock,
  Tag,
} from "lucide-react";

// ─── Event status badge ────────────────────────────────────────────────

const eventStatusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> =
{
  draft: { label: "Draft", dot: "bg-slate-400", bg: "bg-slate-500/10 border-slate-500/20", text: "text-slate-400" },
  published: { label: "Published", dot: "bg-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400" },
  cancelled: { label: "Cancelled", dot: "bg-red-400", bg: "bg-red-500/10 border-red-500/20", text: "text-red-400" },
  completed: { label: "Completed", dot: "bg-blue-400", bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-400" },
};

function EventStatusBadge({ status }: { status: string }) {
  const config = eventStatusConfig[status] ?? {
    label: status,
    dot: "bg-slate-400",
    bg: "bg-slate-500/10 border-slate-500/20",
    text: "text-slate-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${config.bg} ${config.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

// ─── Main component ────────────────────────────────────────────────────

export default async function OrganizerEventDetail({ id }: { id: string }) {
  let event: OrganizerEvent;
  try {
    event = await fetchOrganizerEventById(id);
  } catch {
    notFound();
  }

  const startDate = new Date(event.start_date).toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const endDate = new Date(event.end_date).toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Check if any tier has deliverables for the organizer
  const tiers = (event as any).sponsorship_tiers ?? event.tiers ?? [];
  const hasDeliverables = tiers.some((t: any) =>
    t.deliverable_form_status && ['SENT_TO_ORGANIZER', 'FILLED', 'SUBMITTED'].includes(t.deliverable_form_status)
  );

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/organizer/events"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to events
      </Link>

      {/* Hero image */}
      {event.image_url && (
        <div className="aspect-[21/9] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
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
        <div className="space-y-8 lg:col-span-2">
          {/* Badges + edit */}
          <div className="flex flex-wrap items-center gap-3">
            <EventStatusBadge status={event.status} />
            {event.category && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <Tag className="h-3 w-3" />
                {event.category.replace(/_/g, " ")}
              </span>
            )}
            {event.edition && (
              <span className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                {event.edition.replace(/_/g, " ")}
              </span>
            )}
            <Link
              href={`/organizer/events/${id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Edit Event
            </Link>
          </div>

          {/* Title + description */}
          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              {event.title}
            </h1>
            {event.description && (
              <p className="whitespace-pre-line text-slate-400 leading-relaxed">
                {event.description}
              </p>
            )}
          </div>

          {/* Tags */}
          {(event.tags?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.tags?.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Sponsorship tiers */}
          {(event.tiers?.length || 0) > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <Layers className="h-5 w-5 text-slate-500" />
                <h2 className="text-lg font-bold text-white">
                  Sponsorship Tiers
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {event.tiers?.map((tier) => (
                  <div
                    key={tier.id}
                    className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 p-5 transition-all hover:border-slate-700"
                  >
                    {/* Accent bar */}
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-white">
                          {tier.name}
                        </h3>
                        {tier.description && (
                          <p className="mt-1 text-sm text-slate-500">
                            {tier.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-emerald-400">
                          {formatInr(tier.amount ?? tier.askingPrice ?? 0)}
                        </div>
                      </div>
                    </div>

                    {(tier.benefits?.length ?? 0) > 0 && (
                      <ul className="mt-4 space-y-1.5">
                        {tier.benefits?.map((b, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-slate-300"
                          >
                            <span className="mt-0.5 text-emerald-400">✓</span>
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Slot progress */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Slots</span>
                        <span>
                          {(tier.slots_available ?? 0)} / {(tier.slots_total ?? tier.totalSlots ?? 0)} available
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                          style={{
                            width: `${((tier.slots_available ?? 0) / Math.max((tier.slots_total ?? tier.totalSlots ?? 1), 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deliverables Section — consolidated all-tiers view */}
          {hasDeliverables && (
            <DeliverableFillSection eventId={event.id} />
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Event details card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Event Details
            </h2>
            <dl className="mt-5 space-y-5 text-sm">
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div>
                  <dt className="font-medium text-slate-300">Start Date</dt>
                  <dd className="text-slate-400">{startDate}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div>
                  <dt className="font-medium text-slate-300">End Date</dt>
                  <dd className="text-slate-400">{endDate}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div>
                  <dt className="font-medium text-slate-300">Location</dt>
                  <dd className="text-slate-400">{event.location}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div>
                  <dt className="font-medium text-slate-300">Expected Footfall</dt>
                  <dd className="text-slate-400">
                    {event.expected_footfall ? event.expected_footfall.toLocaleString("en-IN") : "N/A"}
                  </dd>
                </div>
              </div>
              {event.edition && (
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <div>
                    <dt className="font-medium text-slate-300">Edition</dt>
                    <dd className="text-slate-400">{event.edition.replace(/_/g, " ")}</dd>
                  </div>
                </div>
              )}
            </dl>
          </div>

          {/* Proposal summary */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Proposals
            </h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-slate-400">
                  <FileText className="h-4 w-4 text-slate-500" />
                  Total received
                </dt>
                <dd className="font-bold text-white">
                  {event.total_proposals}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-slate-400">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Pending review
                </dt>
                <dd className="font-bold text-amber-400">
                  {event.pending_proposals}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-slate-400">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Total revenue
                </dt>
                <dd className="font-bold text-emerald-400">
                  {formatInr(event.total_sponsorship_amount ?? 0)}
                </dd>
              </div>
            </dl>
          </div>

          {/* CTA */}
          <Link
            href={`/organizer/events/proposals?event_id=${event.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
          >
            View Proposals for This Event
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </aside>
      </div>
    </div>
  );
}
