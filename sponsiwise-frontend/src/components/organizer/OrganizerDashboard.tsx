import Link from "next/link";
import {
  Calendar,
  Globe,
  FileText,
  Clock,
  CheckCircle2,
  Wallet,
  ArrowRight,
  AlertCircle,
  Plus,
} from "lucide-react";
import {
  fetchOrganizerDashboardStats,
  fetchIncomingProposals,
} from "@/lib/organizer-api";
import type { OrganizerDashboardStats } from "@/lib/types/organizer";
import type { IncomingProposal } from "@/lib/types/organizer";
import ProposalStatusBadge from "@/components/shared/ProposalStatusBadge";

// ─── Stats cards ───────────────────────────────────────────────────────

function StatsGrid({ stats }: { stats: OrganizerDashboardStats }) {
  const cards = [
    {
      label: "Total Events",
      value: stats.total_events,
      icon: Calendar,
      gradient: "from-emerald-500 to-green-500",
      glow: "shadow-emerald-500/20",
    },
    {
      label: "Published",
      value: stats.published_events,
      icon: Globe,
      gradient: "from-blue-500 to-blue-600",
      glow: "shadow-blue-500/20",
    },
    {
      label: "Proposals Received",
      value: stats.total_proposals_received,
      icon: FileText,
      gradient: "from-purple-500 to-violet-500",
      glow: "shadow-purple-500/20",
    },
    {
      label: "Pending Review",
      value: stats.pending_proposals,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      glow: "shadow-amber-500/20",
    },
    {
      label: "Approved",
      value: stats.approved_proposals,
      icon: CheckCircle2,
      gradient: "from-teal-400 to-emerald-500",
      glow: "shadow-teal-500/20",
    },
    {
      label: "Sponsorship Revenue",
      value: `${stats.currency} ${stats.total_sponsorship_revenue.toLocaleString()}`,
      icon: Wallet,
      gradient: "from-sky-400 to-blue-500",
      glow: "shadow-sky-500/20",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg ${card.glow} transition-all duration-300 hover:border-slate-700 hover:-translate-y-0.5 hover:shadow-xl`}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br ${card.gradient} opacity-10 blur-xl transition-opacity group-hover:opacity-20`} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-white">{card.value}</p>
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg ${card.glow}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Recent incoming proposals table ───────────────────────────────────

function RecentProposals({ proposals }: { proposals: IncomingProposal[] }) {
  if (proposals.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <FileText className="mx-auto h-8 w-8 text-slate-500" />
        <p className="mt-3 text-sm text-slate-400">
          No sponsorship proposals received yet.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Once sponsors submit proposals for your events, they&apos;ll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Proposal</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Sponsor</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Event</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {proposals.map((p) => (
              <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <Link
                    href={`/dashboard/proposals/${p.id}`}
                    className="text-sm font-medium text-blue-400 hover:text-sky-300 transition-colors"
                  >
                    {p.title}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {p.sponsor.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.sponsor.logo_url}
                        alt={p.sponsor.name}
                        className="h-6 w-6 rounded-full object-cover ring-1 ring-slate-700"
                      />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-sky-400 text-xs font-bold text-white">
                        {p.sponsor.name.charAt(0)}
                      </span>
                    )}
                    <span className="text-sm text-slate-300">{p.sponsor.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">{p.event.title}</td>
                <td className="px-6 py-4 text-sm font-medium text-white">
                  {p.currency} {p.amount.toLocaleString()}
                </td>
                <td className="px-6 py-4"><ProposalStatusBadge status={p.status} /></td>
                <td className="px-6 py-4 text-sm text-slate-500">
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

// ─── Main component ────────────────────────────────────────────────────

export default async function OrganizerDashboard() {
  let stats: OrganizerDashboardStats | null = null;
  let recentProposals: IncomingProposal[] = [];
  let error: string | null = null;

  try {
    const [statsRes, proposalsRes] = await Promise.all([
      fetchOrganizerDashboardStats(),
      fetchIncomingProposals({ page: 1, page_size: 5 }),
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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Overview of your events and sponsorship activity.
          </p>
        </div>
        <div className="flex gap-3 self-start sm:self-center">
          <Link
            href="/dashboard/events/new"
            className="group inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-400 shadow-lg shadow-emerald-500/10 transition-all hover:bg-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/20 hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Create Event
          </Link>
          <Link
            href="/dashboard/events"
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
          >
            <Calendar className="h-4 w-4" />
            My Events
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {error ? (
        <ErrorCard message={error} />
      ) : (
        <>
          {stats && <StatsGrid stats={stats} />}

          <div>
            <div className="mb-4 flex items-center justify-between">
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
