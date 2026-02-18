import { FilterTabsSkeleton, ListRowSkeleton } from "@/components/shared";

export default function ActivityLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-40 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-64 rounded bg-gray-200" />
        </div>
        <div className="h-9 w-28 rounded bg-gray-200" />
      </div>

      <FilterTabsSkeleton count={5} />
      <ListRowSkeleton count={10} />
    </div>
  );
}
