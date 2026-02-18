export default function EventsLoading() {
  return (
    <div className="space-y-8 animate-pulse bg-blue-200 p-8">
      {/* Header skeleton */}
      <div>
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-72 rounded bg-gray-200" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex gap-4 rounded-lg bg-white p-4 shadow">
        <div className="h-10 flex-1 rounded bg-gray-200" />
        <div className="h-10 w-40 rounded bg-gray-200" />
        <div className="h-10 w-24 rounded bg-gray-200" />
      </div>

      {/* Card grid skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl bg-white shadow">
            <div className="aspect-[16/9] bg-gray-200" />
            <div className="space-y-3 p-5">
              <div className="h-3 w-16 rounded bg-gray-200" />
              <div className="h-5 w-3/4 rounded bg-gray-200" />
              <div className="h-3 w-full rounded bg-gray-200" />
              <div className="h-3 w-2/3 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
