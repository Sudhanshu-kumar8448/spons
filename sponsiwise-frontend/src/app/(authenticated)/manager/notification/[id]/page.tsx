// Placeholder for notification detail - the folder structure requires [id]
import { notFound } from "next/navigation";

interface NotificationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function NotificationDetailPage({
  params,
}: NotificationDetailPageProps) {
  const { id } = await params;
  // Notification detail view - future implementation
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Notification Detail</h1>
      <p className="text-sm text-slate-400">Notification ID: {id}</p>
    </div>
  );
}
