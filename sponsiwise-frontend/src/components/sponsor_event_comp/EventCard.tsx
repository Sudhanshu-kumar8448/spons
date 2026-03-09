"use client";

import Link from "next/link";
import { MapPin, Users, Layers } from "lucide-react";
import type { BrowsableEvent } from "@/lib/types/sponsor";
import CategoryHero, { CategoryBadge } from "./CategoryHero";
import { getCategoryStyle } from "./category-config";

/* ─── Tier pill (compact) ────────────────────────────────── */

function TierPill({ tierType, availableSlots }: { tierType: string; availableSlots: number }) {
  const label = tierType.replace(/_/g, " ");
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-300">
      {label}
      <span className="text-slate-500">·</span>
      <span className="text-emerald-400">{availableSlots}</span>
    </span>
  );
}

/* ─── EventCard ──────────────────────────────────────────── */

interface EventCardProps {
  event: BrowsableEvent;
}

export default function EventCard({ event }: EventCardProps) {
  const config = getCategoryStyle(event.category);
  const city = event.address?.city;
  const state = event.address?.state;
  const locationLabel = city && state ? `${city}, ${state}` : event.location || "Location TBA";

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur transition-all duration-300 hover:border-slate-600 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/30">
      {/* Category Hero header */}
      <CategoryHero
        category={event.category}
        className="aspect-[16/8] w-full"
      />

      {/* Card body */}
      <div className="flex flex-1 flex-col p-5 gap-3">
        {/* Category badge + footfall */}
        <div className="flex items-center justify-between">
          <CategoryBadge category={event.category} />
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
            <Users className="h-3.5 w-3.5 text-blue-400" />
            {event.expectedFootfall.toLocaleString("en-IN")}
          </span>
        </div>

        {/* Event title */}
        <h3 className="text-lg font-bold text-white leading-snug line-clamp-2 group-hover:text-blue-300 transition-colors">
          {event.title}
        </h3>

        {/* Location + Edition */}
        <div className="flex items-center gap-1.5 text-sm text-slate-400">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <span className="truncate">{locationLabel}</span>
        </div>
        {event.edition && (
          <span className="inline-flex items-center gap-1 self-start rounded-lg border border-slate-700/60 bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-blue-300">
            {event.edition.replace(/_/g, " ")}
          </span>
        )}

        {/* Available sponsorship tiers */}
        {event.tiers.length > 0 && (
          <div className="mt-auto">
            <div className="flex items-center gap-1.5 mb-2">
              <Layers className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {event.tiers.length} Tier{event.tiers.length !== 1 ? "s" : ""} Available
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {event.tiers.slice(0, 4).map((tier) => (
                <TierPill
                  key={tier.id}
                  tierType={tier.tierType}
                  availableSlots={tier.availableSlots}
                />
              ))}
              {event.tiers.length > 4 && (
                <span className="inline-flex items-center rounded-lg border border-slate-700/60 bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                  +{event.tiers.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        <Link
          href={`/brand/browseEvents/${event.id}`}
          className={`mt-3 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${config.gradient} px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5`}
        >
          Express Interest
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
