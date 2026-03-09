import { notFound } from "next/navigation";
import { fetchVerifiableEventById } from "@/lib/manager-api";
import type { ManagerEventDetail } from "@/lib/types/manager";
import { VerificationStatus } from "@/lib/types/manager";
import Link from "next/link";
import VerificationStatusBadge from "@/components/shared/VerificationStatusBadge";

interface PastEventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PastEventDetailPage({
  params,
}: PastEventDetailPageProps) {
  const { id } = await params;

  let event: ManagerEventDetail;
  try {
    event = await fetchVerifiableEventById(id);
  } catch {
    notFound();
  }

  const startDate = new Date(event.start_date).toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const endDate = new Date(event.end_date).toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <Link
        href="/manager/pastEvents"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        ← Back to past events
      </Link>

      <div className="rounded-xl bg-white p-6 shadow">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {event.organizer?.name} · 📍 {event.location}
            </p>
          </div>
          <VerificationStatusBadge status={VerificationStatus[event.verification_status.toUpperCase() as keyof typeof VerificationStatus]} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Start Date</p>
            <p className="text-sm text-gray-700">{startDate}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">End Date</p>
            <p className="text-sm text-gray-700">{endDate}</p>
          </div>
        </div>

        {event.description && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase text-gray-500">Description</p>
            <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{event.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
