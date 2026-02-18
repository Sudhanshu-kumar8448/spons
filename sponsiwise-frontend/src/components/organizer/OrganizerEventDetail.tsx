import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchOrganizerEventById } from "@/lib/organizer-api";
import type { OrganizerEvent } from "@/lib/types/organizer";

// ─── Event status badge ────────────────────────────────────────────────

const eventStatusConfig: Record<string, { label: string; className: string }> =
{
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  published: { label: "Published", className: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
  completed: { label: "Completed", className: "bg-blue-100 text-blue-700" },
};

function EventStatusBadge({ status }: { status: string }) {
  const config = eventStatusConfig[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
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
          <div className="flex items-center gap-3">
            <EventStatusBadge status={event.status} />
            {event.category && (
              <span className="inline-block rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                {event.category}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
          <p className="whitespace-pre-line text-gray-600">
            {event.description}
          </p>

          {(event.tags?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.tags?.map((tag) => (
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
                      <span className="text-sm font-bold text-green-600">
                        {tier.currency} {tier.amount.toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {tier.description}
                    </p>
                    {tier.benefits.length > 0 && (
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
                      {tier.slots_available} / {tier.slots_total} slot
                      {tier.slots_total !== 1 ? "s" : ""} available
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Event details */}
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

          {/* Proposal summary */}
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Proposals
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Total received</dt>
                <dd className="font-semibold text-gray-900">
                  {event.total_proposals}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Pending review</dt>
                <dd className="font-semibold text-yellow-600">
                  {event.pending_proposals}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Total revenue</dt>
                <dd className="font-semibold text-green-600">
                  {event.currency}{" "}
                  {event.total_sponsorship_amount.toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* CTA */}
          <Link
            href={`/dashboard/proposals?event_id=${event.id}`}
            className="block w-full rounded-xl bg-green-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            View Proposals for This Event
          </Link>
        </aside>
      </div>
    </div>
  );
}
