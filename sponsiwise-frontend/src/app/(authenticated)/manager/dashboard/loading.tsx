export default function ManagerDashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-slate-800" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-800" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-slate-800" />
    </div>
  );
}
