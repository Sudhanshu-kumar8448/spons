export default function BrowseEventsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-7 w-40 rounded bg-slate-800" />
        <div className="mt-2 h-4 w-64 rounded bg-slate-800" />
      </div>
      <div className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="h-10 flex-1 rounded-xl bg-slate-800" />
        <div className="h-10 w-40 rounded-xl bg-slate-800" />
        <div className="h-10 w-24 rounded-xl bg-slate-800" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="aspect-[16/9] bg-slate-800" />
            <div className="space-y-3 p-5">
              <div className="h-3 w-16 rounded bg-slate-800" />
              <div className="h-5 w-3/4 rounded bg-slate-800" />
              <div className="h-3 w-full rounded bg-slate-800" />
              <div className="h-3 w-2/3 rounded bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
