import Link from "next/link";
import { Bell, ChevronLeft, AlertCircle } from "lucide-react";
import { fetchNotifications } from "@/lib/notifications-api";
import type { Notification } from "@/lib/types/notifications";
import { normalizeError } from "@/lib/errors";
import { ErrorState, EmptyState } from "@/components/shared";
import NotificationList from "@/components/shared/NotificationList";

const PAGE_SIZE = 20;

// ─── Page component ────────────────────────────────────────────────────

interface NotificationsPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

export default async function NotificationsPage({
  searchParams,
}: NotificationsPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;

  let notifications: Notification[] = [];
  let total = 0;
  let error: string | null = null;

  try {
    const res = await fetchNotifications({ page, pageSize: PAGE_SIZE });
    notifications = res.data;
    total = res.total;
  } catch (err) {
    error = normalizeError(
      err,
      "Unable to load notifications. Please try again later.",
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="mt-1 text-sm text-slate-400">
            Your recent notifications and alerts.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 self-start rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white sm:self-center"
        >
          <ChevronLeft className="h-4 w-4" />
          Dashboard
        </Link>
      </div>

      {/* Results */}
      {error ? (
        <ErrorState message={error} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="🔔"
          heading="No notifications"
          description="You don't have any notifications yet."
        />
      ) : (
        <NotificationList
          initialNotifications={notifications}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
        />
      )}
    </div>
  );
}
