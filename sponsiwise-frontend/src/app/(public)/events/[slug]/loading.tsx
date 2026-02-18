export default function EventDetailLoading() {
  return (
    <div className="space-y-8 animate-pulse bg-blue-200 p-8">
      <div className="h-4 w-28 rounded bg-gray-200" />
      <div className="aspect-[21/9] rounded-xl bg-gray-200" />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="h-3 w-20 rounded bg-gray-200" />
          <div className="h-8 w-2/3 rounded bg-gray-200" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-4 w-3/4 rounded bg-gray-200" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl bg-white p-6 shadow">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="mt-4 space-y-4">
              <div className="h-4 w-full rounded bg-gray-200" />
              <div className="h-4 w-full rounded bg-gray-200" />
              <div className="h-4 w-2/3 rounded bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
