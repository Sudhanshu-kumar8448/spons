export default function NotificationsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-40 rounded bg-slate-800" />
          <div className="mt-2 h-4 w-64 rounded bg-slate-800" />
        </div>
        <div className="h-10 w-28 rounded-xl bg-slate-800" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="h-10 w-10 rounded-full bg-slate-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-slate-800" />
            <div className="h-3 w-1/2 rounded bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
