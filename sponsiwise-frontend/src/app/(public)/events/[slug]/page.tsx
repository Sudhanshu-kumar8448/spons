import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchPublicEventBySlug } from "@/lib/public-api";
import type { PublicEvent } from "@/lib/types/public";

interface EventDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  const { slug } = await params;

  const event = await fetchPublicEventBySlug(slug).catch(() => null);

  if (!event) {
    notFound();
    return null;
  }

  const startDate = new Date(event.start_date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const endDate = new Date(event.end_date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* ── Back link ─────────────────────────────────── */}
      <Link
        href="/events"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        ← Back to events
      </Link>

      {/* ── Hero image ────────────────────────────────── */}
      {event.image_url && (
        <div className="aspect-[21/9] overflow-hidden rounded-xl bg-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.image_url}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* ── Content ───────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          {event.category && (
            <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {event.category}
            </span>
          )}

          <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>

          <p className="whitespace-pre-line text-gray-600">
            {event.description}
          </p>

          {/* Tags */}
          {(event.tags?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.tags?.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Details
            </h2>

            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="font-medium text-gray-700">Start</dt>
                <dd className="text-gray-600">{startDate}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700">End</dt>
                <dd className="text-gray-600">{endDate}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-700">Location</dt>
                <dd className="text-gray-600">{event.location}</dd>
              </div>
            </dl>
          </div>

          {/* Organizer card */}
          {event.organizer && (
            <div className="rounded-xl bg-white p-6 shadow">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Organizer
              </h2>
              <div className="mt-4 flex items-center gap-3">
                {event.organizer.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.organizer.logo_url}
                    alt={event.organizer.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-500">
                    {event.organizer.name.charAt(0)}
                  </span>
                )}
                <span className="font-medium text-gray-900">
                  {event.organizer.name}
                </span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
