import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchVerifiableEventById } from "@/lib/manager-api";
import { verifyEventAction } from "@/app/(authenticated)/dashboard/_manager-actions";
import type { VerifiableEvent } from "@/lib/types/manager";
import { VerificationStatus } from "@/lib/types/manager";
import VerificationStatusBadge from "@/components/shared/VerificationStatusBadge";
import VerifyRejectButtons from "@/components/manager/VerifyRejectButtons";

export default async function EventVerificationDetail({
  id,
}: {
  id: string;
}) {
  let event: VerifiableEvent;
  try {
    event = await fetchVerifiableEventById(id);
  } catch {
    notFound();
  }

  const isPending = event.verification_status === VerificationStatus.PENDING;

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
            <VerificationStatusBadge status={event.verification_status} />
            {event.category && (
              <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                {event.category}
              </span>
            )}
            <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {event.status}
            </span>
            <Link
              href={`/dashboard/events/${id}/lifecycle`}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              📊 View Lifecycle
            </Link>
          </div>

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

          {/* Verification notes (shown if reviewed) */}
          {event.verification_notes && (
            <div
              className={`rounded-xl p-6 shadow ${event.verification_status === VerificationStatus.VERIFIED
                  ? "border border-green-200 bg-green-50"
                  : event.verification_status === VerificationStatus.REJECTED
                    ? "border border-red-200 bg-red-50"
                    : "bg-white"
                }`}
            >
              <h2 className="text-lg font-semibold text-gray-900">
                Verification Notes
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm text-gray-700">
                {event.verification_notes}
              </p>
              {event.verified_at && (
                <p className="mt-2 text-xs text-gray-500">
                  Reviewed on{" "}
                  {new Date(event.verified_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          )}

          {/* Verify / Reject form (only for pending) */}
          {isPending && (
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Verify This Event
              </h2>
              <VerifyRejectButtons
                entityId={event.id}
                entityType="event"
                serverAction={verifyEventAction}
              />
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
              {/* Expected Footfall */}
              <div>
                <dt className="font-medium text-gray-700">Expected Footfall</dt>
                <dd className="text-gray-600">
                  {event.expected_footfall
                    ? event.expected_footfall.toLocaleString()
                    : "N/A"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Organizer card */}
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
              <div>
                <p className="font-medium text-gray-900">
                  {event.organizer.name}
                </p>
                <p className="text-xs text-gray-500">
                  {event.organizer.email}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl bg-white p-6 shadow">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Timeline
            </h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="font-medium text-gray-900">
                  {new Date(event.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Last updated</dt>
                <dd className="font-medium text-gray-900">
                  {new Date(event.updated_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </dd>
              </div>
              {event.verified_at && (
                <div>
                  <dt className="text-gray-500">Verified</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(event.verified_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
