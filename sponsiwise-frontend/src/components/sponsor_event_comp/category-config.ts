import type { EventCategory } from "@/lib/types/sponsor";

/* ─── Category style config (server-safe, no React) ────── */

export interface CategoryStyle {
  label: string;
  gradient: string;
  iconBg: string;
  accent: string;
  accentBg: string;
  patternColor: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  TECHNOLOGY: {
    label: "Technology",
    gradient: "from-blue-600 via-cyan-500 to-blue-400",
    iconBg: "bg-blue-500/30",
    accent: "text-cyan-300",
    accentBg: "bg-cyan-500/15",
    patternColor: "text-cyan-400/10",
  },
  MUSIC_ENTERTAINMENT: {
    label: "Music & Entertainment",
    gradient: "from-purple-600 via-fuchsia-500 to-pink-400",
    iconBg: "bg-purple-500/30",
    accent: "text-fuchsia-300",
    accentBg: "bg-fuchsia-500/15",
    patternColor: "text-fuchsia-400/10",
  },
  BUSINESS: {
    label: "Business",
    gradient: "from-slate-700 via-blue-800 to-indigo-600",
    iconBg: "bg-indigo-500/30",
    accent: "text-indigo-300",
    accentBg: "bg-indigo-500/15",
    patternColor: "text-indigo-400/10",
  },
  EDUCATION: {
    label: "Education",
    gradient: "from-emerald-600 via-teal-500 to-green-400",
    iconBg: "bg-emerald-500/30",
    accent: "text-emerald-300",
    accentBg: "bg-emerald-500/15",
    patternColor: "text-emerald-400/10",
  },
  SPORTS: {
    label: "Sports",
    gradient: "from-orange-600 via-red-500 to-amber-400",
    iconBg: "bg-orange-500/30",
    accent: "text-orange-300",
    accentBg: "bg-orange-500/15",
    patternColor: "text-orange-400/10",
  },
  CULTURAL: {
    label: "Cultural",
    gradient: "from-amber-600 via-yellow-500 to-orange-300",
    iconBg: "bg-amber-500/30",
    accent: "text-amber-300",
    accentBg: "bg-amber-500/15",
    patternColor: "text-amber-400/10",
  },
  ART_CREATIVE: {
    label: "Art & Creative",
    gradient: "from-rose-600 via-pink-500 to-fuchsia-400",
    iconBg: "bg-rose-500/30",
    accent: "text-rose-300",
    accentBg: "bg-rose-500/15",
    patternColor: "text-rose-400/10",
  },
  LIFESTYLE: {
    label: "Lifestyle",
    gradient: "from-green-600 via-lime-500 to-emerald-400",
    iconBg: "bg-lime-500/30",
    accent: "text-lime-300",
    accentBg: "bg-lime-500/15",
    patternColor: "text-lime-400/10",
  },
  OTHER: {
    label: "Other",
    gradient: "from-slate-600 via-gray-500 to-slate-400",
    iconBg: "bg-slate-500/30",
    accent: "text-slate-300",
    accentBg: "bg-slate-500/15",
    patternColor: "text-slate-400/10",
  },
};

export function getCategoryStyle(category: EventCategory | string): CategoryStyle {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.OTHER;
}
