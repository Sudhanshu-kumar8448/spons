import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchBrowsableEventById } from "@/lib/sponsor-api";
import type { BrowsableEvent, GenderType, AgeBracket, IncomeBracket } from "@/lib/types/sponsor";
import {
  Calendar,
  MapPin,
  Users,
  Globe,
  Phone,
  Mail,
  ArrowLeft,
  Layers,
  Lock,
  BarChart3,
} from "lucide-react";
import { CategoryHero, CategoryBadge, getCategoryStyle } from "@/components/sponsor_event_comp";
import { ViewDeliverablesButton } from "@/components/sponsor/TierDeliverables";
import { ExpressInterestButton } from "@/components/sponsor/ExpressInterestButton";
import { formatInr } from "@/lib/currency";

// ─── Audience Profile helpers ──────────────────────────────────────────

function getGenderLabel(g: GenderType) {
  return { MALE: "Male", FEMALE: "Female", OTHER: "Other" }[g] ?? g;
}
function getAgeBracketLabel(b: AgeBracket) {
  return { AGE_5_12: "5–12", AGE_12_17: "12–17", AGE_17_28: "17–28", AGE_28_45: "28–45", AGE_45_PLUS: "45+" }[b] ?? b;
}
function getIncomeBracketLabel(b: IncomeBracket) {
  return { BELOW_10L: "Below ₹10L", BETWEEN_10L_25L: "₹10L–25L", BETWEEN_25L_50L: "₹25L–50L", BETWEEN_50L_1CR: "₹50L–1Cr", ABOVE_1CR: "Above ₹1Cr" }[b] ?? b;
}

function DistBar({ label, pct, color = "bg-blue-500" }: { label: string; pct: number; color?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-semibold text-white">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AudienceProfileSection({ profile }: { profile: NonNullable<BrowsableEvent["audienceProfile"]> }) {
  const genderColors = ["bg-blue-500", "bg-pink-500", "bg-purple-500"];
  const ageColors = ["bg-cyan-500", "bg-teal-500", "bg-emerald-500", "bg-lime-500", "bg-yellow-500"];
  const incomeColors = ["bg-orange-500", "bg-amber-500", "bg-yellow-500", "bg-green-500", "bg-emerald-500"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-slate-500" />
        <h2 className="text-lg font-bold text-white">Audience Profile</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Gender */}
        {profile.genders.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Gender</h3>
            <div className="space-y-3">
              {profile.genders.map((g, i) => (
                <DistBar key={g.gender} label={getGenderLabel(g.gender)} pct={g.percentage} color={genderColors[i % genderColors.length]} />
              ))}
            </div>
          </div>
        )}

        {/* Age Groups */}
        {profile.ages.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Age Groups</h3>
            <div className="space-y-3">
              {profile.ages.map((a, i) => (
                <DistBar key={a.bracket} label={getAgeBracketLabel(a.bracket)} pct={a.percentage} color={ageColors[i % ageColors.length]} />
              ))}
            </div>
          </div>
        )}

        {/* Income Brackets */}
        {profile.incomes.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Income Brackets</h3>
            <div className="space-y-3">
              {profile.incomes.map((inc, i) => (
                <DistBar key={inc.bracket} label={getIncomeBracketLabel(inc.bracket)} pct={inc.percentage} color={incomeColors[i % incomeColors.length]} />
              ))}
            </div>
          </div>
        )}

        {/* Regions */}
        {profile.regions.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Top Regions</h3>
            <div className="space-y-3">
              {profile.regions.map((r) => (
                <DistBar key={`${r.stateOrUT}-${r.country}`} label={`${r.stateOrUT}, ${r.country}`} pct={r.percentage} color="bg-indigo-500" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BrandEventDetailPage({
  params,
}: EventDetailPageProps) {
  const { id } = await params;

  let event: BrowsableEvent;
  try {
    event = await fetchBrowsableEventById(id);
  } catch {
    notFound();
  }

  const config = getCategoryStyle(event.category);

  const startDate = new Date(event.startDate).toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const endDate = new Date(event.endDate).toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const city = event.address?.city;
  const state = event.address?.state;
  const locationLabel =
    city && state ? `${city}, ${state}` : event.location || "Location TBA";

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/brand/browseEvents"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to events
      </Link>

      

      <div className="grid gap-8 lg:grid-cols-3">
        {/* ── Main content ── */}
        <div className="space-y-8 lg:col-span-2">
          {/* Title section */}
          <div className="space-y-3">
            <CategoryBadge category={event.category} />
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {event.title}
            </h1>
            {event.description && (
              <p className="whitespace-pre-line text-slate-400 leading-relaxed">
                {event.description}
              </p>
            )}
          </div>

          {/* Sponsorship tiers */}
          {event.tiers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <Layers className="h-5 w-5 text-slate-500" />
                <h2 className="text-lg font-bold text-white">
                  Available Sponsorship Tiers
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {event.tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="group/tier relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 p-5 transition-all hover:border-slate-700"
                  >
                    {/* Tier gradient accent bar */}
                    <div
                      className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${config.gradient}`}
                    />

                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-white">
                          {tier.tierType.replace(/_/g, " ")}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {tier.availableSlots} of {tier.totalSlots} slot
                          {tier.totalSlots !== 1 ? "s" : ""} available
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-emerald-400">
                          {formatInr(tier.askingPrice)}
                        </div>
                      </div>
                    </div>

                    {/* Slot progress bar */}
                    <div className="mt-4">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${config.gradient} transition-all`}
                          style={{
                            width: `${((tier.totalSlots - tier.soldSlots) / tier.totalSlots) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    {tier.isLocked && (
                      <div className="mt-3 inline-flex items-center gap-1 text-xs text-amber-400">
                        <Lock className="h-3 w-3" />
                        Tier locked
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-4 flex flex-col gap-2">
                      <ViewDeliverablesButton
                        tierId={tier.id}
                        tierName={tier.tierType.replace(/_/g, " ")}
                        eventId={event.id}
                        hasDeliverables={tier.deliverableFormStatus === "SUBMITTED"}
                      />
                      <Link
                        href={`/brand/proposals/new?event_id=${event.id}&tier_id=${tier.id}`}
                        className={`flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r ${config.gradient} px-3 py-2 text-xs font-bold text-white shadow transition hover:shadow-lg hover:-translate-y-0.5`}
                      >
                        Submit Proposal
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audience Profile Section */}
          {event.audienceProfile && (
            <AudienceProfileSection profile={event.audienceProfile} />
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="space-y-6">
          {/* Event Details card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Event Details
            </h2>
            <dl className="mt-5 space-y-5 text-sm">
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                <div>
                  <dt className="font-medium text-slate-300">Dates</dt>
                  <dd className="text-slate-400">
                    {startDate}
                    <br />– {endDate}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                <div>
                  <dt className="font-medium text-slate-300">Location</dt>
                  <dd className="text-slate-400">{locationLabel}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                <div>
                  <dt className="font-medium text-slate-300">
                    Expected Footfall
                  </dt>
                  <dd className="text-slate-400">
                    {event.expectedFootfall.toLocaleString("en-IN")} attendees
                  </dd>
                </div>
              </div>
              {event.edition && (
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                  <div>
                    <dt className="font-medium text-slate-300">Edition</dt>
                    <dd className="text-slate-400">{event.edition.replace(/_/g, ' ')}</dd>
                  </div>
                </div>
              )}
              
            </dl>
          </div>

          

          {/* CTA */}
          <ExpressInterestButton eventId={event.id} gradient={config.gradient} />
        </aside>
      </div>
    </div>
  );
}
