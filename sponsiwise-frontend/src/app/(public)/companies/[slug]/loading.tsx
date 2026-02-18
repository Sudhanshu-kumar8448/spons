export default function CompanyProfileLoading() {
  return (
    <div className="space-y-10 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-6">
        <div className="h-20 w-20 rounded-xl bg-gray-200" />
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-gray-200" />
          <div className="h-4 w-64 rounded bg-gray-200" />
          <div className="flex gap-2">
            <div className="h-7 w-20 rounded bg-gray-200" />
            <div className="h-7 w-20 rounded bg-gray-200" />
          </div>
        </div>
      </div>

      {/* About skeleton */}
      <div className="rounded-xl bg-white p-6 shadow">
        <div className="h-5 w-16 rounded bg-gray-200" />
        <div className="mt-3 space-y-2">
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-2/3 rounded bg-gray-200" />
        </div>
      </div>

      {/* Events skeleton */}
      <div>
        <div className="h-5 w-36 rounded bg-gray-200" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl bg-white shadow">
              <div className="aspect-[16/9] bg-gray-200" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
