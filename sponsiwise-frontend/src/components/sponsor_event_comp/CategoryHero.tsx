"use client";

import {
  Cpu,
  Music,
  Briefcase,
  GraduationCap,
  Trophy,
  Landmark,
  Palette,
  Heart,
  Sparkles,
} from "lucide-react";
import type { EventCategory } from "@/lib/types/sponsor";
import { getCategoryStyle } from "./category-config";

/* ─── Icon map (client-only, uses React components) ────── */

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  TECHNOLOGY: Cpu,
  MUSIC_ENTERTAINMENT: Music,
  BUSINESS: Briefcase,
  EDUCATION: GraduationCap,
  SPORTS: Trophy,
  CULTURAL: Landmark,
  ART_CREATIVE: Palette,
  LIFESTYLE: Heart,
  OTHER: Sparkles,
};

function getCategoryIcon(category: string): React.FC<{ className?: string }> {
  return ICON_MAP[category] ?? Sparkles;
}

/* ─── CategoryHero: card header visual ───────────────────── */

interface CategoryHeroProps {
  category: EventCategory | string;
  className?: string;
}

export default function CategoryHero({ category, className = "" }: CategoryHeroProps) {
  const style = getCategoryStyle(category);
  const Icon = getCategoryIcon(category);
  const { gradient, iconBg, patternColor } = style;

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${gradient} ${className}`}
    >
      {/* Decorative circles */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className={`absolute -top-8 -right-8 h-32 w-32 rounded-full border-[6px] ${patternColor} border-current`}
        />
        <div
          className={`absolute -bottom-6 -left-6 h-24 w-24 rounded-full border-[4px] ${patternColor} border-current`}
        />
        <div
          className={`absolute top-1/2 left-1/3 h-16 w-16 rounded-full border-[3px] ${patternColor} border-current`}
        />
      </div>

      {/* Centered icon */}
      <div className="relative flex h-full items-center justify-center">
        <div className={`rounded-2xl ${iconBg} p-4 backdrop-blur-sm`}>
          <Icon className="h-10 w-10 text-white/90" />
        </div>
      </div>
    </div>
  );
}

/* ─── CategoryBadge: small inline badge ──────────────────── */

interface CategoryBadgeProps {
  category: EventCategory | string;
  className?: string;
}

export function CategoryBadge({ category, className = "" }: CategoryBadgeProps) {
  const style = getCategoryStyle(category);
  const Icon = getCategoryIcon(category);
  const { accent, accentBg, label } = style;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${accent} ${accentBg} ${className}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
