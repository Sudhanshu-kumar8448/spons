import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchBrowsableEventById } from "@/lib/sponsor-api";
import type { BrowsableEvent } from "@/lib/types/sponsor";
import {
  Calendar,
  MapPin,
  Users,
  Globe,
  Phone,
  Mail,
  ArrowLeft,
  Layers,
  DollarSign,
  Lock,
} from "lucide-react";
import { CategoryHero, CategoryBadge, getCategoryStyle } from "@/components/sponsor_event_comp";

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

  const startDate = new Date(event.startDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const endDate = new Date(event.endDate).toLocaleDateString("en-US", {
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

      {/* Hero banner with category visual */}
      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <CategoryHero
          category={event.category}
          className="aspect-[21/7] w-full"
        />
      </div>

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
                        <div className="flex items-center gap-1 text-lg font-bold text-emerald-400">
                          <DollarSign className="h-4 w-4" />
                          {tier.askingPrice.toLocaleString()}
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
                  </div>
                ))}
              </div>
            </div>
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
                    {event.expectedFootfall.toLocaleString()} attendees
                  </dd>
                </div>
              </div>
              {event.website && (
                <div className="flex items-start gap-3">
                  <Globe className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                  <div>
                    <dt className="font-medium text-slate-300">Website</dt>
                    <dd>
                      <a
                        href={event.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {event.website}
                      </a>
                    </dd>
                  </div>
                </div>
              )}
              {event.contactEmail && (
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                  <div>
                    <dt className="font-medium text-slate-300">Email</dt>
                    <dd className="text-slate-400">{event.contactEmail}</dd>
                  </div>
                </div>
              )}
              {event.contactPhone && (
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                  <div>
                    <dt className="font-medium text-slate-300">Phone</dt>
                    <dd className="text-slate-400">{event.contactPhone}</dd>
                  </div>
                </div>
              )}
            </dl>
          </div>

          {/* Organizer card */}
          {event.organizer && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Organizer
              </h2>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-400 text-sm font-bold text-white">
                  {event.organizer.name.charAt(0)}
                </span>
                <span className="font-semibold text-white">
                  {event.organizer.name}
                </span>
              </div>
            </div>
          )}

          {/* CTA */}
          <Link
            href={`/brand/proposals/new?event_id=${event.id}`}
            className={`flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r ${config.gradient} px-4 py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5`}
          >
            Express Interest
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </aside>
      </div>
    </div>
  );
}
