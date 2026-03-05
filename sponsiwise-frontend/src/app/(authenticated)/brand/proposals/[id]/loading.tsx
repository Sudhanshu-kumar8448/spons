export default function ProposalDetailLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-4 w-32 rounded bg-slate-800" />
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-slate-800" />
          <div className="h-4 w-32 rounded bg-slate-800" />
        </div>
        <div className="h-10 w-36 rounded bg-slate-800" />
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="h-40 rounded-xl bg-slate-800" />
          <div className="h-32 rounded-xl bg-slate-800" />
        </div>
        <div className="space-y-6">
          <div className="h-36 rounded-xl bg-slate-800" />
          <div className="h-36 rounded-xl bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
