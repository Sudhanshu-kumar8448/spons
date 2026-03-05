export default function ProposalsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-40 rounded bg-slate-800" />
          <div className="mt-2 h-4 w-64 rounded bg-slate-800" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-slate-800" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-slate-800" />
        ))}
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-slate-800 px-6 py-4 last:border-0">
            <div className="h-4 flex-1 rounded bg-slate-800" />
            <div className="h-4 w-24 rounded bg-slate-800" />
            <div className="h-4 w-20 rounded bg-slate-800" />
            <div className="h-4 w-16 rounded bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
