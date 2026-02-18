// ─── Skeleton primitives ───────────────────────────────────────────────

function Bar({
  width,
  height = "h-4",
}: {
  width: string;
  height?: string;
}) {
  return <div className={`${height} ${width} animate-pulse rounded bg-slate-800`} />;
}

function Circle({ size = "h-8 w-8" }: { size?: string }) {
  return <div className={`${size} animate-pulse rounded-full bg-slate-800`} />;
}

function Pill({ width = "w-20" }: { width?: string }) {
  return <div className={`h-6 ${width} animate-pulse rounded-full bg-slate-800`} />;
}

// ─── Composites ────────────────────────────────────────────────────────

/** Skeleton for a search bar */
export function SearchBarSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex gap-3">
        <div className="h-9 flex-1 rounded-xl bg-slate-800" />
        <div className="h-9 w-24 rounded-xl bg-slate-800" />
      </div>
    </div>
  );
}

/** Skeleton for filter pill tabs */
export function FilterTabsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Pill key={i} />
      ))}
    </div>
  );
}

/** Skeleton for a single stat card */
export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <Bar width="w-24" height="h-3" />
      <div className="mt-3">
        <Bar width="w-16" height="h-7" />
      </div>
    </div>
  );
}

/** Skeleton for a grid of stat cards */
export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton for a table row */
function TableRowSkeleton({ columns }: { columns: number }) {
  return (
    <div className="flex items-center gap-6 px-6 py-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Bar key={i} width={i === 0 ? "w-40" : "w-24"} />
      ))}
    </div>
  );
}

/** Skeleton for a full data table */
export function TableSkeleton({
  rows = 8,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="divide-y divide-slate-800">
        {Array.from({ length: rows }).map((_, i) => (
          <TableRowSkeleton key={i} columns={columns} />
        ))}
      </div>
    </div>
  );
}

/** Skeleton for a table row with an avatar */
function AvatarTableRowSkeleton({ columns }: { columns: number }) {
  return (
    <div className="flex items-center gap-6 px-6 py-4">
      <Circle />
      <div className="flex-1 space-y-1">
        <Bar width="w-36" />
        <Bar width="w-48" height="h-3" />
      </div>
      {Array.from({ length: columns - 1 }).map((_, i) => (
        <Bar key={i} width="w-20" />
      ))}
    </div>
  );
}

/** Skeleton for a user / avatar table */
export function AvatarTableSkeleton({
  rows = 8,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="divide-y divide-slate-800">
        {Array.from({ length: rows }).map((_, i) => (
          <AvatarTableRowSkeleton key={i} columns={columns} />
        ))}
      </div>
    </div>
  );
}

/** Skeleton for list-style rows (e.g. activity log) */
export function ListRowSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4"
        >
          <Circle size="h-9 w-9" />
          <div className="flex-1 space-y-2">
            <Bar width="w-3/4" />
            <div className="flex gap-3">
              <Bar width="w-24" height="h-3" />
              <Bar width="w-32" height="h-3" />
              <Bar width="w-16" height="h-3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton for a detail card (e.g. user detail, company detail) */
export function DetailCardSkeleton({
  fields = 4,
}: {
  fields?: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <Bar width="w-32" height="h-4" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i}>
            <Bar width="w-16" height="h-3" />
            <div className="mt-2">
              <Bar width="w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Full-page composites ──────────────────────────────────────────────

/**
 * A full-page loading skeleton for list pages
 * (search bar + filter tabs + data table).
 */
export function ListPageSkeleton({
  tabCount = 4,
  tableRows = 8,
  tableColumns = 5,
  showAvatar = false,
}: {
  tabCount?: number;
  tableRows?: number;
  tableColumns?: number;
  showAvatar?: boolean;
}) {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div>
        <Bar width="w-48" height="h-7" />
        <div className="mt-2">
          <Bar width="w-64" />
        </div>
      </div>

      <SearchBarSkeleton />
      <FilterTabsSkeleton count={tabCount} />

      {showAvatar ? (
        <AvatarTableSkeleton rows={tableRows} columns={tableColumns} />
      ) : (
        <TableSkeleton rows={tableRows} columns={tableColumns} />
      )}
    </div>
  );
}

/**
 * A full-page loading skeleton for dashboard / overview pages
 * (stats grid + table).
 */
export function DashboardPageSkeleton({
  statCount = 4,
  tableRows = 5,
  tableColumns = 5,
}: {
  statCount?: number;
  tableRows?: number;
  tableColumns?: number;
}) {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div>
        <Bar width="w-48" height="h-7" />
        <div className="mt-2">
          <Bar width="w-72" />
        </div>
      </div>

      <StatsGridSkeleton count={statCount} />
      <TableSkeleton rows={tableRows} columns={tableColumns} />
    </div>
  );
}

/**
 * A full-page loading skeleton for detail pages
 * (breadcrumb + header + two-column layout).
 */
export function DetailPageSkeleton({
  sidebarCards = 2,
}: {
  sidebarCards?: number;
}) {
  return (
    <div className="space-y-8 animate-pulse">
      <Bar width="w-28" />

      {/* Header with avatar */}
      <div className="flex items-center gap-4">
        <Circle size="h-14 w-14" />
        <div>
          <Bar width="w-48" height="h-7" />
          <div className="mt-2">
            <Bar width="w-36" />
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DetailCardSkeleton fields={6} />
          <DetailCardSkeleton fields={2} />
        </div>
        <div className="space-y-6">
          {Array.from({ length: sidebarCards }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <Bar width="w-28" height="h-4" />
              <div className="mt-4">
                <Bar width="w-full" height="h-10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
