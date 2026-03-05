import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface NotificationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizerNotificationDetailPage({
  params,
}: NotificationDetailPageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/organizer/notification"
          className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-white">Notification Detail</h1>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-slate-400">Notification ID: {id}</p>
      </div>
    </div>
  );
}
