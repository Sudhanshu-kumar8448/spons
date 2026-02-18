import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchPublicCompany } from "@/lib/public-api";
import type { PublicCompany } from "@/lib/types/public";

interface CompanyProfilePageProps {
  params: Promise<{ slug: string }>;
}

export default async function CompanyProfilePage({
  params,
}: CompanyProfilePageProps) {
  const { slug } = await params;

  const company = await fetchPublicCompany(slug).catch(() => null);

  if (!company) {
    notFound();
    return null;
  }

  return (
    <div className="space-y-10">
      {/* ── Header ────────────────────────────────────── */}
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        {company.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logo_url}
            alt={company.name}
            className="h-20 w-20 rounded-xl object-cover shadow"
          />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-200 text-3xl font-bold text-gray-500 shadow">
            {company.name.charAt(0)}
          </span>
        )}

        <div>
          <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            {company.industry && <span>🏢 {company.industry}</span>}
            {company.location && <span>📍 {company.location}</span>}
            {company.founded_year && (
              <span>📆 Founded {company.founded_year}</span>
            )}
          </div>

          {/* Social / Website links */}
          <div className="mt-3 flex flex-wrap gap-3">
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                🌐 Website
              </a>
            )}
            {company.social_links?.linkedin && (
              <a
                href={company.social_links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                LinkedIn
              </a>
            )}
            {company.social_links?.twitter && (
              <a
                href={company.social_links.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Twitter
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── About ─────────────────────────────────────── */}
      <section className="rounded-xl bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-gray-900">About</h2>
        <p className="mt-3 whitespace-pre-line text-sm text-gray-600">
          {company.description}
        </p>
      </section>

      {/* ── Sponsored events ──────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">
          Sponsored Events
        </h2>

        {(company.sponsored_events?.length || 0) === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            This company hasn&apos;t sponsored any public events yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {company.sponsored_events?.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl bg-white shadow transition-shadow hover:shadow-md"
              >
                <div className="aspect-[16/9] bg-gray-200">
                  {event.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">
                      <span className="text-3xl">📅</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {event.title}
                  </h3>
                  <div className="mt-1 flex gap-3 text-xs text-gray-500">
                    <span>📍 {event.location}</span>
                    <span>
                      🗓{" "}
                      {new Date(event.start_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
