export default function OrganizerNotificationsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-48 rounded-lg bg-slate-800" />
          <div className="mt-2 h-4 w-64 rounded-lg bg-slate-800" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-slate-800" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-slate-800/50" />
        ))}
      </div>
    </div>
  );
}
