export default function EventDetailLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-4 w-32 rounded bg-slate-800" />
      <div className="aspect-[21/9] rounded-xl bg-slate-800" />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="h-3 w-20 rounded bg-slate-800" />
          <div className="h-8 w-2/3 rounded bg-slate-800" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-slate-800" />
            <div className="h-4 w-5/6 rounded bg-slate-800" />
            <div className="h-4 w-3/4 rounded bg-slate-800" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="h-48 rounded-xl bg-slate-800" />
          <div className="h-24 rounded-xl bg-slate-800" />
          <div className="h-12 rounded-xl bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
