export default function LifecycleLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Back link */}
      <div className="h-4 w-32 rounded bg-gray-200" />

      {/* Header card */}
      <div className="rounded-xl bg-white p-6 shadow">
        <div className="h-6 w-64 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-40 rounded bg-gray-200" />
        <div className="mt-4 flex gap-2">
          <div className="h-6 w-20 rounded-full bg-gray-200" />
          <div className="h-6 w-20 rounded-full bg-gray-200" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl bg-white p-6 shadow">
        <div className="h-4 w-40 rounded bg-gray-200 mb-3" />
        <div className="h-4 w-full rounded-full bg-gray-200" />
      </div>

      {/* Timeline skeleton */}
      <div className="rounded-xl bg-gray-50 p-6 shadow space-y-6">
        <div className="h-4 w-32 rounded bg-gray-200" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-9 w-9 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 rounded-lg bg-white p-4 shadow-sm space-y-2">
              <div className="h-4 w-48 rounded bg-gray-200" />
              <div className="h-3 w-full rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
