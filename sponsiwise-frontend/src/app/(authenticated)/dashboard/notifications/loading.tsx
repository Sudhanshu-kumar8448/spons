import { ListRowSkeleton } from "@/components/shared";

export default function NotificationsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-40 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-64 rounded bg-gray-200" />
        </div>
        <div className="h-9 w-28 rounded bg-gray-200" />
      </div>

      <ListRowSkeleton count={10} />
    </div>
  );
}
