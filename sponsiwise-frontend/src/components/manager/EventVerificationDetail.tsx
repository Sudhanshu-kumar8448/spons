import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchVerifiableEventById } from "@/lib/manager-api";
import { authFetch } from "@/lib/auth-fetch";
import { verifyEventAction } from "@/app/(authenticated)/manager/_actions";
import {
  VerificationStatus,
  type ManagerEventDetail,
  type AudienceProfile,
  type GenderType,
  type AgeBracket,
  type IncomeBracket,
} from "@/lib/types/manager";
import VerificationStatusBadge from "@/components/shared/VerificationStatusBadge";
import VerifyRejectButtons from "@/components/manager/VerifyRejectButtons";
import { ManageDeliverablesButton, TierCompareButton, SendAllDeliverablesButton } from "@/components/manager/DeliverableManager";

interface PresignedDownloadResponse {
  downloadUrl: string;
  expiresIn: number;
}

function extractStorageKey(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl);
    const path = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    if (!path) return null;

    // Path-style MinIO URL: /bucket/key
    const parts = path.split("/");
    if (
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      parts.length > 1
    ) {
      return parts.slice(1).join("/");
    }

    if (path.startsWith("sponsiwise/")) {
      return path.slice("sponsiwise/".length);
    }

    return null;
  } catch {
    return null;
  }
}

// Helper to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Label helpers for audience profile
function getGenderLabel(gender: GenderType): string {
  const map: Record<GenderType, string> = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' };
  return map[gender] ?? gender;
}

function getAgeBracketLabel(bracket: AgeBracket): string {
  const map: Record<AgeBracket, string> = {
    AGE_5_12: '5 – 12',
    AGE_12_17: '12 – 17',
    AGE_17_28: '17 – 28',
    AGE_28_45: '28 – 45',
    AGE_45_PLUS: '45+',
  };
  return map[bracket] ?? bracket;
}

function getIncomeBracketLabel(bracket: IncomeBracket): string {
  const map: Record<IncomeBracket, string> = {
    BELOW_10L: 'Below ₹10L',
    BETWEEN_10L_25L: '₹10L – ₹25L',
    BETWEEN_25L_50L: '₹25L – ₹50L',
    BETWEEN_50L_1CR: '₹50L – ₹1Cr',
    ABOVE_1CR: 'Above ₹1Cr',
  };
  return map[bracket] ?? bracket;
}

// Reusable horizontal bar row for distributions
function DistributionRow({ label, percentage, color = 'bg-indigo-500' }: { label: string; percentage: number; color?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-semibold text-slate-100">{percentage.toFixed(1)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
        <div className={`h-full ${color} transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

// Audience Profile section component
function AudienceProfileSection({ profile }: { profile: AudienceProfile }) {
  const genderColors: Record<GenderType, string> = {
    MALE: 'bg-blue-500',
    FEMALE: 'bg-pink-500',
    OTHER: 'bg-purple-500',
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-6">
      <h2 className="text-lg font-semibold text-white">Audience Profile</h2>

      {/* Gender */}
      {profile.genders.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-slate-400">Gender Distribution</h3>
          <div className="space-y-3">
            {profile.genders.map((g) => (
              <DistributionRow
                key={g.id}
                label={getGenderLabel(g.gender)}
                percentage={g.percentage}
                color={genderColors[g.gender] ?? 'bg-slate-500'}
              />
            ))}
          </div>
        </div>
      )}

      {/* Age */}
      {profile.ages.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-slate-400">Age Distribution</h3>
          <div className="space-y-3">
            {profile.ages.map((a) => (
              <DistributionRow
                key={a.id}
                label={getAgeBracketLabel(a.bracket)}
                percentage={a.percentage}
                color="bg-emerald-500"
              />
            ))}
          </div>
        </div>
      )}

      {/* Income */}
      {profile.incomes.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-slate-400">Income Distribution</h3>
          <div className="space-y-3">
            {profile.incomes.map((i) => (
              <DistributionRow
                key={i.id}
                label={getIncomeBracketLabel(i.bracket)}
                percentage={i.percentage}
                color="bg-amber-500"
              />
            ))}
          </div>
        </div>
      )}

      {/* Region */}
      {profile.regions.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-slate-400">Region Distribution</h3>
          <div className="space-y-3">
            {profile.regions.map((r) => (
              <DistributionRow
                key={r.id}
                label={`${r.stateOrUT}, ${r.country}`}
                percentage={r.percentage}
                color="bg-cyan-500"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
  const isNotActioned = verificationStatus !== "VERIFIED" && verificationStatus !== "REJECTED";
  const badgeStatus = Object.values(VerificationStatus).includes(
    verificationStatus as VerificationStatus,
  )
    ? (verificationStatus as VerificationStatus)
    : VerificationStatus.PENDING;

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

  let pptDeckDownloadUrl: string | null = null;
  if (event.ppt_deck_url) {
    const key = extractStorageKey(event.ppt_deck_url);
    if (key) {
      try {
        const result = await authFetch<PresignedDownloadResponse>(
          "/upload/presigned-url/download",
          {
            method: "POST",
            body: JSON.stringify({ key }),
          },
        );
        pptDeckDownloadUrl = result.downloadUrl;
      } catch {
        pptDeckDownloadUrl = null;
      }
    }
  }

  return (
    <div className="space-y-8">
      <Link
        href="/manager/verifyEvents"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white"
      >
        <span className="text-base leading-none">←</span>
        <span>Back to events</span>
      </Link>

      {/* Hero image */}
      {event.image_url && (
        <div className="aspect-[21/9] overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.image_url}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* ── ACTION BAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <VerificationStatusBadge status={badgeStatus} />
          <span className="inline-block rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
            {(event.status || "").toUpperCase()}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          <h1 className="text-3xl font-bold text-white">{event.title}</h1>
          <p className="whitespace-pre-line text-slate-300">
            {event.description}
          </p>

          {/* PPT Deck Section */}
          {event.ppt_deck_url && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
              <h3 className="font-medium text-blue-200">📄 Presentation Deck</h3>
              <p className="mt-1 text-sm text-blue-100/80">
                The organizer has uploaded a presentation deck for this event.
              </p>
              {pptDeckDownloadUrl ? (
                <a
                  href={pptDeckDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
                >
                  📥 Download PPT Deck
                </a>
              ) : (
                <p className="mt-3 text-sm text-blue-200/80">
                  Secure download link is currently unavailable.
                </p>
              )}
            </div>
          )}

          {/* Sponsorship Tiers Section */}
          {event.sponsorship_tiers && event.sponsorship_tiers.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-lg font-semibold text-white">
                  Sponsorship Tiers
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <SendAllDeliverablesButton
                    eventId={event.id}
                    hasDraftForms={event.sponsorship_tiers.some(t => t.deliverable_form_status === 'DRAFT')}
                  />
                  <TierCompareButton
                    eventId={event.id}
                    tiers={event.sponsorship_tiers.map((t) => ({ id: t.id, tier_type: getTierDisplayName(t.tier_type) }))}
                  />
                </div>
              </div>
              <div className="space-y-4">
                {event.sponsorship_tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className={`rounded-lg border p-4 ${tier.is_available
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-red-500/30 bg-red-500/10'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-slate-100">
                          {getTierDisplayName(tier.tier_type)}
                        </h3>
                        <p className="text-sm text-slate-300">
                          {formatCurrency(tier.asking_price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${tier.is_available ? 'text-emerald-300' : 'text-red-300'
                            }`}>
                            {tier.available_slots} / {tier.total_slots}
                          </span>
                          <span className="text-sm text-slate-400">slots</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          {tier.is_locked ? (
                            <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-200">
                              🔒 Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-200">
                              Unlocked
                            </span>
                          )}
                          {tier.is_available ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-200">
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-200">
                              Sold Out
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Progress bar for slots */}
                    <div className="mt-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
                        <div
                          className={`h-full transition-all ${tier.is_available ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          style={{
                            width: `${tier.total_slots > 0 ? (tier.sold_slots / tier.total_slots) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    {/* Manage Deliverables */}
                    <ManageDeliverablesButton
                      tierId={tier.id}
                      tierType={getTierDisplayName(tier.tier_type)}
                      formStatus={tier.deliverable_form_status}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audience Profile Section */}
          {event.audience_profile && (
            <AudienceProfileSection profile={event.audience_profile} />
          )}

          {/* ── APPROVE / REJECT PANEL ── */}
          {isNotActioned && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-6">
              <h2 className="mb-4 text-lg font-semibold text-amber-100">
                Review This Event
              </h2>
              <p className="mb-4 text-sm text-amber-100/80">
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
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center">
              <p className="font-medium text-emerald-200">✅ This event has been verified and is visible to sponsors.</p>
            </div>
          )}
          {verificationStatus === "REJECTED" && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-center">
              <p className="font-medium text-red-200">❌ This event has been rejected.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Event details */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Event Details
            </h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="font-medium text-slate-300">Start</dt>
                <dd className="text-slate-100">{startDate}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-300">End</dt>
                <dd className="text-slate-100">{endDate}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-300">Location</dt>
                <dd className="text-slate-100">{event.location || 'N/A'}</dd>
              </div>
              {event.venue && (
                <div>
                  <dt className="font-medium text-slate-300">Venue</dt>
                  <dd className="text-slate-100">{event.venue}</dd>
                </div>
              )}
              <div>
                <dt className="font-medium text-slate-300">Expected Footfall</dt>
                <dd className="text-slate-100">
                  {event.expected_footfall
                    ? event.expected_footfall.toLocaleString("en-IN")
                    : "N/A"}
                </dd>
              </div>
              {event.category && (
                <div>
                  <dt className="font-medium text-slate-300">Category</dt>
                  <dd className="text-slate-100">{event.category}</dd>
                </div>
              )}
              {event.edition && (
                <div>
                  <dt className="font-medium text-slate-300">Edition</dt>
                  <dd className="text-slate-100">{event.edition.replace(/_/g, ' ')}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Contact Details */}
          {(event.contact_phone || event.contact_email) && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Contact
              </h2>
              <dl className="mt-4 space-y-2 text-sm">
                {event.contact_email && (
                  <div>
                    <dt className="font-medium text-slate-300">Email</dt>
                    <dd className="break-all text-slate-100">{event.contact_email}</dd>
                  </div>
                )}
                {event.contact_phone && (
                  <div>
                    <dt className="font-medium text-slate-300">Phone</dt>
                    <dd className="text-slate-100">{event.contact_phone}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Address */}
          {event.address && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Address
              </h2>
              <address className="mt-4 not-italic text-sm text-slate-100">
                <p>{event.address.address_line_1}</p>
                {event.address.address_line_2 && <p className="text-slate-200">{event.address.address_line_2}</p>}
                <p>
                  {event.address.city}, {event.address.state} {event.address.postal_code}
                </p>
                <p className="text-slate-200">{event.address.country}</p>
              </address>
            </div>
          )}

          {/* Organizer card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
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
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-slate-300">
                  {event.organizer.name.charAt(0)}
                </span>
              )}
              <div>
                <p className="font-medium text-slate-100">
                  {event.organizer.name}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Timeline
            </h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-400">Created</dt>
                <dd className="font-medium text-slate-100">
                  {new Date(event.created_at).toLocaleDateString("en-IN", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Last updated</dt>
                <dd className="font-medium text-slate-100">
                  {new Date(event.updated_at).toLocaleDateString("en-IN", {
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
