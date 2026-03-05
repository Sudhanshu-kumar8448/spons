export default function OrganizerEventsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded bg-slate-800" />
        <div className="h-10 w-32 rounded-xl bg-slate-800" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-slate-800" />
      ))}
    </div>
  );
}
