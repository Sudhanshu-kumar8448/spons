import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchVerifiableEventById } from "@/lib/manager-api";
import { verifyEventAction } from "@/app/(authenticated)/dashboard/_manager-actions";
import type { ManagerEventDetail } from "@/lib/types/manager";
import VerificationStatusBadge from "@/components/shared/VerificationStatusBadge";
import VerifyRejectButtons from "@/components/manager/VerifyRejectButtons";

// Helper to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper to get tier display name
function getTierDisplayName(tierType: string): string {
  const names: Record<string, string> = {
    TITLE: 'Title Sponsor',
    PLATINUM: 'Platinum Sponsor',
    PRESENTING: 'Presenting Sponsor',
    POWERED_BY: 'Powered By',
    GOLD: 'Gold Tier',
    SILVER: 'Silver Tier',
  };
  return names[tierType] || tierType;
}

export default async function EventVerificationDetail({
  id,
}: {
  id: string;
}) {
  let event: ManagerEventDetail;
  try {
    event = await fetchVerifiableEventById(id);
  } catch {
    notFound();
  }

  const verificationStatus = (event.verification_status || "").toUpperCase();
  const isPending = verificationStatus === "PENDING";
  const isNotActioned = verificationStatus !== "VERIFIED" && verificationStatus !== "REJECTED";

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

      {/* ── ACTION BAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <VerificationStatusBadge status={verificationStatus as any} />
          <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {(event.status || "").toUpperCase()}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/events/${id}/lifecycle`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            📊 Lifecycle
          </Link>
          <Link
            href={`/dashboard/events/${id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            ✏️ Edit Event
          </Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
          <p className="whitespace-pre-line text-gray-600">
            {event.description}
          </p>

          {/* PPT Deck Section */}
          {event.ppt_deck_url && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <h3 className="font-medium text-blue-900">📄 Presentation Deck</h3>
              <p className="mt-1 text-sm text-blue-700">
                The organizer has uploaded a presentation deck for this event.
              </p>
              <a
                href={event.ppt_deck_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                📥 Download PPT Deck
              </a>
            </div>
          )}

          {/* Sponsorship Tiers Section */}
          {event.sponsorship_tiers && event.sponsorship_tiers.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Sponsorship Tiers
              </h2>
              <div className="space-y-4">
                {event.sponsorship_tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className={`rounded-lg border p-4 ${tier.is_available
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {getTierDisplayName(tier.tier_type)}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(tier.asking_price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${tier.is_available ? 'text-green-700' : 'text-red-700'
                            }`}>
                            {tier.available_slots} / {tier.total_slots}
                          </span>
                          <span className="text-sm text-gray-500">slots</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          {tier.is_locked ? (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                              🔒 Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                              Unlocked
                            </span>
                          )}
                          {tier.is_available ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                              Sold Out
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Progress bar for slots */}
                    <div className="mt-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full transition-all ${tier.is_available ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          style={{
                            width: `${tier.total_slots > 0 ? (tier.sold_slots / tier.total_slots) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── APPROVE / REJECT PANEL ── */}
          {isNotActioned && (
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Review This Event
              </h2>
              <p className="mb-4 text-sm text-gray-600">
                Review the event details above and either approve or reject this event.
                Approving will make it visible to sponsors.
              </p>
              <VerifyRejectButtons
                entityId={event.id}
                entityType="event"
                serverAction={verifyEventAction}
              />
            </div>
          )}

          {/* Already actioned banner */}
          {verificationStatus === "VERIFIED" && (
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 text-center">
              <p className="font-medium text-green-800">✅ This event has been verified and is visible to sponsors.</p>
            </div>
          )}
          {verificationStatus === "REJECTED" && (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-center">
              <p className="font-medium text-red-800">❌ This event has been rejected.</p>
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
                <dd className="text-gray-600">{event.location || 'N/A'}</dd>
              </div>
              {event.venue && (
                <div>
                  <dt className="font-medium text-gray-700">Venue</dt>
                  <dd className="text-gray-600">{event.venue}</dd>
                </div>
              )}
              <div>
                <dt className="font-medium text-gray-700">Expected Footfall</dt>
                <dd className="text-gray-600">
                  {event.expected_footfall
                    ? event.expected_footfall.toLocaleString()
                    : "N/A"}
                </dd>
              </div>
              {event.category && (
                <div>
                  <dt className="font-medium text-gray-700">Category</dt>
                  <dd className="text-gray-600">{event.category}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Contact Details */}
          {(event.contact_phone || event.contact_email) && (
            <div className="rounded-xl bg-white p-6 shadow">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Contact
              </h2>
              <dl className="mt-4 space-y-2 text-sm">
                {event.contact_email && (
                  <div>
                    <dt className="font-medium text-gray-700">Email</dt>
                    <dd className="text-gray-600">{event.contact_email}</dd>
                  </div>
                )}
                {event.contact_phone && (
                  <div>
                    <dt className="font-medium text-gray-700">Phone</dt>
                    <dd className="text-gray-600">{event.contact_phone}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Address */}
          {event.address && (
            <div className="rounded-xl bg-white p-6 shadow">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Address
              </h2>
              <address className="mt-4 not-italic text-sm text-gray-600">
                <p>{event.address.address_line_1}</p>
                {event.address.address_line_2 && <p>{event.address.address_line_2}</p>}
                <p>
                  {event.address.city}, {event.address.state} {event.address.postal_code}
                </p>
                <p>{event.address.country}</p>
              </address>
            </div>
          )}

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
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
