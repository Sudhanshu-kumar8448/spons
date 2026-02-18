import Link from "next/link";
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Building2,
  Calendar,
  FileText,
  Handshake,
  TrendingUp,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { fetchAdminDashboardStats } from "@/lib/admin-api";
import type { AdminDashboardStats } from "@/lib/types/admin";

export default async function AdminDashboard() {
  let stats: AdminDashboardStats | null = null;
  let error: string | null = null;

  try {
    stats = await fetchAdminDashboardStats();
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Failed to load dashboard metrics.";
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">System Overview</h2>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
          <p className="mt-2 text-sm text-red-300">
            {error ?? "Unable to load metrics."}
          </p>
        </div>
      </div>
    );
  }

  // ── Metric cards ───────────────────────────────────────────────────

  const topCards = [
    {
      label: "Total Users",
      value: stats.total_users,
      icon: Users,
      gradient: "from-blue-500 to-blue-600",
      glow: "shadow-blue-500/20",
      href: "/dashboard/users",
    },
    {
      label: "Active Users",
      value: stats.active_users,
      icon: UserCheck,
      gradient: "from-emerald-500 to-emerald-600",
      glow: "shadow-emerald-500/20",
      href: "/dashboard/users?status=active",
    },
    {
      label: "Inactive Users",
      value: stats.inactive_users,
      icon: UserX,
      gradient: "from-slate-500 to-slate-600",
      glow: "shadow-slate-500/20",
      href: "/dashboard/users?status=inactive",
    },
    {
      label: "Recent Signups",
      value: stats.recent_registrations,
      icon: UserPlus,
      gradient: "from-sky-400 to-blue-500",
      glow: "shadow-sky-500/20",
    },
  ];

  const entityCards = [
    {
      label: "Companies",
      value: stats.total_companies,
      icon: Building2,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      label: "Events",
      value: stats.total_events,
      icon: Calendar,
      color: "text-sky-400",
      bg: "bg-sky-500/10",
    },
    {
      label: "Proposals",
      value: stats.total_proposals,
      icon: FileText,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Sponsorships",
      value: stats.total_sponsorships,
      icon: Handshake,
      color: "text-teal-400",
      bg: "bg-teal-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">System Overview</h2>
        <p className="mt-1 text-sm text-slate-400">
          High-level tenant metrics at a glance
        </p>
      </div>

      {/* User metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {topCards.map((card, i) => {
          const Icon = card.icon;
          const inner = (
            <div
              className={`group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg ${card.glow} transition-all duration-300 hover:border-slate-700 hover:-translate-y-1 hover:shadow-xl`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Gradient accent */}
              <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br ${card.gradient} opacity-10 blur-xl transition-opacity duration-300 group-hover:opacity-20`} />

              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    {card.value.toLocaleString()}
                  </p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg ${card.glow}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          );
          return card.href ? (
            <Link key={card.label} href={card.href}>
              {inner}
            </Link>
          ) : (
            <div key={card.label}>{inner}</div>
          );
        })}
      </div>

      {/* Entity metrics */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Platform Entities
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {entityCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition-all duration-300 hover:border-slate-700 hover:shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg}`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {card.label}
                  </p>
                </div>
                <p className={`mt-3 text-3xl font-bold text-white`}>
                  {card.value.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Users by role breakdown */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Users by Role
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(stats.users_by_role).map(([role, count]) => (
            <Link
              key={role}
              href={`/dashboard/users?role=${role}`}
              className="group rounded-2xl border border-slate-800 bg-slate-900 p-4 transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {role}
              </p>
              <p className="mt-1 text-2xl font-bold text-white">
                {count.toLocaleString()}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Signup trend chart */}
      {stats.signup_trend.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Signup Trend (last 30 days)
            </h3>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </div>
          <div className="flex items-end gap-1" style={{ height: 120 }}>
            {(() => {
              const maxCount = Math.max(
                ...stats.signup_trend.map((d) => d.count),
                1,
              );
              return stats.signup_trend.map((day) => (
                <div
                  key={day.date}
                  className="group relative flex-1"
                  style={{ height: "100%" }}
                >
                  <div
                    className="absolute bottom-0 w-full rounded-t bg-gradient-to-t from-blue-600 to-sky-400 transition-all group-hover:from-blue-500 group-hover:to-sky-300 group-hover:shadow-lg group-hover:shadow-blue-500/20"
                    style={{
                      height: `${(day.count / maxCount) * 100}%`,
                      minHeight: day.count > 0 ? 2 : 0,
                    }}
                  />
                  {/* Tooltip on hover */}
                  <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 rounded-lg bg-slate-700 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
                    {day.count}
                  </div>
                </div>
              ));
            })()}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-slate-500">
            <span>
              {new Date(stats.signup_trend[0].date).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric" },
              )}
            </span>
            <span>
              {new Date(
                stats.signup_trend[stats.signup_trend.length - 1].date,
              ).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/users"
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
          >
            Manage Users
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/dashboard/users?status=inactive"
            className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            View Inactive Users
          </Link>
        </div>
      </div>
    </div>
  );
}
