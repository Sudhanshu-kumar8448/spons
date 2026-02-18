import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle2,
  Wallet,
  Handshake,
  Calendar,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { getServerUser } from "@/lib/auth";
import { UserRole } from "@/lib/types/roles";
import {
  fetchSponsorDashboardStats,
  fetchSponsorProposals,
} from "@/lib/sponsor-api";
import type { SponsorDashboardStats, Proposal } from "@/lib/types/sponsor";
import ProposalStatusBadge from "@/components/shared/ProposalStatusBadge";
import OrganizerDashboard from "@/components/organizer/OrganizerDashboard";
import ManagerDashboard from "@/components/manager/ManagerDashboard";
import AdminDashboard from "@/components/admin/AdminDashboard";

// ─── Stats cards ───────────────────────────────────────────────────────

function StatsGrid({ stats }: { stats: SponsorDashboardStats }) {
  const cards = [
    {
      label: "Total Proposals",
      value: stats.total_proposals,
      icon: FileText,
      gradient: "from-blue-500 to-blue-600",
      glow: "shadow-blue-500/20",
    },
    {
      label: "Pending",
      value: stats.pending_proposals,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      glow: "shadow-amber-500/20",
    },
    {
      label: "Approved",
      value: stats.approved_proposals,
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-green-500",
      glow: "shadow-emerald-500/20",
    },
    {
      label: "Active Sponsorships",
      value: stats.total_sponsorships,
      icon: Handshake,
      gradient: "from-purple-500 to-violet-500",
      glow: "shadow-purple-500/20",
    },
    {
      label: "Total Invested",
      value: `${stats.currency} ${stats.total_invested.toLocaleString()}`,
      icon: Wallet,
      gradient: "from-sky-400 to-blue-500",
      glow: "shadow-sky-500/20",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg ${card.glow} transition-all duration-300 hover:border-slate-700 hover:-translate-y-1 hover:shadow-xl`}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br ${card.gradient} opacity-10 blur-xl transition-opacity group-hover:opacity-20`} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {card.value}
                </p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg ${card.glow}`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Recent proposals table ────────────────────────────────────────────

function RecentProposals({ proposals }: { proposals: Proposal[] }) {
  if (proposals.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <FileText className="mx-auto h-8 w-8 text-slate-500" />
        <p className="mt-3 text-sm text-slate-400">
          You haven&apos;t created any proposals yet.
        </p>
        <Link
          href="/dashboard/events"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
        >
          Browse events
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 sm:px-6">Proposal</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 sm:px-6">Event</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 sm:px-6">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 sm:px-6">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 sm:px-6">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {proposals.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-slate-800/50">
                <td className="px-4 py-4 sm:px-6">
                  <Link
                    href={`/dashboard/proposals/${p.id}`}
                    className="text-sm font-medium text-blue-400 transition-colors hover:text-sky-300"
                  >
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-4 text-sm text-slate-400 sm:px-6">{p.event.title}</td>
                <td className="px-4 py-4 text-sm font-medium text-white sm:px-6">
                  {p.currency} {p.amount.toLocaleString()}
                </td>
                <td className="px-4 py-4 sm:px-6"><ProposalStatusBadge status={p.status} /></td>
                <td className="px-4 py-4 text-sm text-slate-500 sm:px-6">
                  {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Error fallback ────────────────────────────────────────────────────

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
      <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
      <p className="mt-2 text-sm text-red-300">{message}</p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const user = await getServerUser();

  // Admin role → system overview dashboard
  if (user?.role === UserRole.ADMIN) {
    return <AdminDashboard />;
  }

  // Manager role → verification dashboard
  if (user?.role === UserRole.MANAGER) {
    return <ManagerDashboard />;
  }

  // Organizer role → separate dashboard
  if (user?.role === UserRole.ORGANIZER) {
    return <OrganizerDashboard />;
  }

  // Default: Sponsor dashboard
  let stats: SponsorDashboardStats | null = null;
  let recentProposals: Proposal[] = [];
  let error: string | null = null;

  try {
    const [statsRes, proposalsRes] = await Promise.all([
      fetchSponsorDashboardStats(),
      fetchSponsorProposals({ page: 1, page_size: 5 }),
    ]);
    stats = statsRes;
    recentProposals = proposalsRes.data;
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Unable to load dashboard data. Please try again later.";
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Overview of your sponsorship activity.
          </p>
        </div>
        <Link
          href="/dashboard/events"
          className="group inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 sm:self-center"
        >
          <Calendar className="h-4 w-4" />
          Browse events
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {error ? (
        <ErrorCard message={error} />
      ) : (
        <>
          {stats && <StatsGrid stats={stats} />}

          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-white">
                Recent Proposals
              </h2>
              <Link
                href="/dashboard/proposals"
                className="group inline-flex items-center gap-1 text-sm font-medium text-blue-400 transition-colors hover:text-sky-300"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <RecentProposals proposals={recentProposals} />
          </div>
        </>
      )}
    </div>
  );
}
