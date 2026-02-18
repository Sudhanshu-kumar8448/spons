export default function ProposalDetailLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-4 w-32 rounded bg-gray-200" />
      <div className="flex items-start justify-between">
        <div>
          <div className="h-7 w-64 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-40 rounded bg-gray-200" />
        </div>
        <div className="h-9 w-36 rounded bg-gray-200" />
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl bg-white p-6 shadow">
            <div className="h-5 w-32 rounded bg-gray-200" />
            <div className="mt-4 space-y-2">
              <div className="h-4 w-full rounded bg-gray-200" />
              <div className="h-4 w-full rounded bg-gray-200" />
              <div className="h-4 w-3/4 rounded bg-gray-200" />
            </div>
          </div>
          <div className="rounded-xl bg-white p-6 shadow">
            <div className="h-5 w-36 rounded bg-gray-200" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="h-8 rounded bg-gray-200" />
              <div className="h-8 rounded bg-gray-200" />
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl bg-white p-6 shadow">
            <div className="h-3 w-12 rounded bg-gray-200" />
            <div className="mt-4 space-y-3">
              <div className="h-4 w-full rounded bg-gray-200" />
              <div className="h-4 w-2/3 rounded bg-gray-200" />
            </div>
          </div>
          <div className="rounded-xl bg-white p-6 shadow">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="mt-4 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-5 w-5 rounded-full bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
