import Link from "next/link";
import { fetchActivityLog } from "@/lib/manager-api";
import type { ActivityLogEntry } from "@/lib/types/manager";
import { normalizeError } from "@/lib/errors";
import { FilterTabs, ErrorState, EmptyState, Pagination } from "@/components/shared";

// ─── Action type config ────────────────────────────────────────────────

const actionConfig: Record<string, { icon: string; color: string }> = {
  user_registered: { icon: "👤", color: "bg-blue-100 text-blue-700" },
  company_registered: { icon: "🏢", color: "bg-purple-100 text-purple-700" },
  company_verified: { icon: "✅", color: "bg-green-100 text-green-700" },
  company_rejected: { icon: "❌", color: "bg-red-100 text-red-700" },
  event_created: { icon: "📅", color: "bg-blue-100 text-blue-700" },
  event_published: { icon: "📢", color: "bg-green-100 text-green-700" },
  event_verified: { icon: "✅", color: "bg-green-100 text-green-700" },
  event_rejected: { icon: "❌", color: "bg-red-100 text-red-700" },
  proposal_submitted: { icon: "📋", color: "bg-yellow-100 text-yellow-700" },
  proposal_approved: { icon: "✓", color: "bg-green-100 text-green-700" },
  proposal_rejected: { icon: "✕", color: "bg-red-100 text-red-700" },
};

const defaultActionConfig = { icon: "📌", color: "bg-gray-100 text-gray-700" };

// ─── Filter tabs ───────────────────────────────────────────────────────

const TYPE_TABS = [
  { value: "", label: "All" },
  { value: "user_registered", label: "Registrations" },
  { value: "company", label: "Companies" },
  { value: "event", label: "Events" },
  { value: "proposal", label: "Proposals" },
];

const PAGE_SIZE = 20;

// ─── Activity entry row ────────────────────────────────────────────────

function ActivityRow({ entry }: { entry: ActivityLogEntry }) {
  const config = actionConfig[entry.action] ?? defaultActionConfig;

  return (
    <div className="flex items-start gap-4 rounded-lg bg-white px-5 py-4 shadow-sm transition-colors hover:bg-gray-50">
      {/* Icon */}
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm ${config.color}`}
      >
        {config.icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">
          {entry.action.replace(/_/g, " ")} on {entry.entityType} ({entry.entityId.slice(0, 8)}…)
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          {entry.actorId && (
            <span>
              by <strong>{entry.actorId.slice(0, 8)}…</strong> ({entry.actorRole})
            </span>
          )}
          <span>
            {new Date(entry.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase text-gray-500">
            {entry.action}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────

interface ActivityLogProps {
  searchParams: {
    page?: string;
    type?: string;
  };
}

export default async function ActivityLog({ searchParams }: ActivityLogProps) {
  const page = Number(searchParams.page) || 1;
  const typeFilter = searchParams.type ?? "";

  let entries: ActivityLogEntry[] = [];
  let total = 0;
  let error: string | null = null;

  try {
    const res = await fetchActivityLog({
      page,
      page_size: PAGE_SIZE,
      type: typeFilter || undefined,
    });
    entries = res.data;
    total = res.total;
  } catch (err) {
    error = normalizeError(err, "Unable to load activity log. Please try again later.");
  }

  // Build link helper
  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { type: typeFilter || undefined, ...overrides };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const qs = params.toString();
    return `/dashboard/activity${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            System Activity
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Read-only audit log of recent platform actions.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-2">
        <FilterTabs
          tabs={TYPE_TABS}
          activeValue={typeFilter}
          buildHref={(v) => buildHref({ type: v || undefined, page: undefined })}
          activeColor="bg-amber-600"
        />
      </div>

      {/* Results */}
      {error ? (
        <ErrorState message={error} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon="📋"
          heading="No activity found"
          description="There is no recent system activity to display."
        />
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Showing {entries.length} of {total} entr
            {total !== 1 ? "ies" : "y"}
          </p>

          <div className="space-y-2">
            {entries.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </div>

          <Pagination
            page={page}
            total={total}
            pageSize={PAGE_SIZE}
            buildHref={(p) => buildHref({ page: String(p) })}
            showPageLabel={false}
          />
        </>
      )}
    </div>
  );
}
