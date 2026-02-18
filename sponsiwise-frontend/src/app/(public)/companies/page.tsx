import Link from "next/link";
import Image from "next/image";
import { fetchPublicCompanies } from "@/lib/public-api";
import type { PublicCompany } from "@/lib/types/public";
import { Search, MapPin, ArrowRight, Building2 } from "lucide-react";
import { MotionWrapper } from "@/components/ui";

// ─── Company card ────────────────────────────────────────────────────────

function CompanyCard({ company, index }: { company: PublicCompany; index: number }) {
  return (
    <MotionWrapper delay={index * 0.05}>
      <Link
        href={`/companies/${company.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/10"
      >
        {/* Logo */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
          {company.logo_url ? (
            <Image
              src={company.logo_url}
              alt={company.name}
              width={600}
              height={340}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-slate-50 text-slate-300">
              <Building2 className="h-12 w-12" />
            </div>
          )}

          {/* Type Badge overlay */}
          {company.type && (
            <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700 backdrop-blur-sm shadow-sm">
              {company.type}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-6">
          <h3 className="text-xl font-bold text-slate-900 transition-colors group-hover:text-blue-600 line-clamp-2">
            {company.name}
          </h3>

          <p className="mt-3 line-clamp-3 text-sm font-medium text-slate-500">
            {company.description || "No description available."}
          </p>

          {/* Meta */}
          {company.location && (
            <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <MapPin className="h-4 w-4 text-blue-500" />
              {company.location}
            </div>
          )}

          {/* Website */}
          {company.website && (
            <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-blue-500">
              🌐 {company.website.replace(/^https?:\/\//, '')}
            </div>
          )}
        </div>
      </Link>
    </MotionWrapper>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 border border-slate-700">
        <Search className="h-8 w-8 text-slate-400" />
      </div>
      <h2 className="mt-6 text-xl font-bold text-white">
        No companies found
      </h2>
      <p className="mt-2 text-base text-slate-400 max-w-sm mx-auto">
        We couldn&apos;t find any companies matching your search. Try adjusting your filters or check back later.
      </p>
    </div>
  );
}

// ─── Error state ───────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="rounded-full bg-red-900/20 p-4 border border-red-900/50">
        <div className="rounded-full bg-red-900/30 p-3">
          <Search className="h-6 w-6 text-red-500" />
        </div>
      </div>
      <h2 className="mt-4 text-lg font-bold text-white">
        Something went wrong
      </h2>
      <p className="mt-1 text-sm text-slate-400">{message}</p>
    </div>
  );
}

// ─── Page (Server Component) ───────────────────────────────────────────

interface ExploreCompaniesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function ExploreCompaniesPage({
  searchParams,
}: ExploreCompaniesPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search;

  let companies: PublicCompany[] = [];
  let total = 0;
  let error: string | null = null;

  try {
    const res = await fetchPublicCompanies({
      page,
      page_size: 12,
      search,
    });
    companies = res.data;
    total = res.total;
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Unable to load companies. Please try again later.";
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* ── Header ────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 pb-32">
        {/* Background elements */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl opacity-50" />
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl opacity-50" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <MotionWrapper>
            <span className="inline-block rounded-full bg-blue-900/30 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-400 border border-blue-800/50">
              Our Partners
            </span>
          </MotionWrapper>

          <MotionWrapper delay={0.1}>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Explore <span className="gradient-text-bold">Companies</span>
            </h1>
          </MotionWrapper>

          <MotionWrapper delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-slate-400">
              Discover leading companies sponsoring events on our platform. 
              Connect with potential partners and explore sponsorship opportunities.
            </p>
          </MotionWrapper>
        </div>
      </section>

      {/* ── Filters & Content ─────────────────────────── */}
      <div className="relative mx-auto -mt-16 max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Search Bar */}
        <MotionWrapper delay={0.3}>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 shadow-2xl backdrop-blur-sm ring-1 ring-white/5">
            <form method="GET" className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="search"
                  name="search"
                  type="text"
                  defaultValue={search ?? ""}
                  placeholder="Search companies..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-sm font-medium text-white transition-all placeholder:text-slate-500 focus:border-blue-500 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 hover:shadow-blue-500/30 active:scale-[0.98]"
              >
                Search
              </button>
            </form>
          </div>
        </MotionWrapper>

        {/* Results */}
        <div className="mt-12">
          {error ? (
            <ErrorState message={error} />
          ) : companies.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  Sponsors
                </h2>
                <span className="rounded-full bg-blue-900/50 px-3 py-1 text-xs font-bold text-blue-300 border border-blue-800">
                  {total} results
                </span>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {companies.map((company, i) => (
                  <CompanyCard key={company.id} company={company} index={i} />
                ))}
              </div>

              {/* Pagination */}
              {total > 12 && (
                <div className="mt-16 flex justify-center gap-4">
                  {page > 1 && (
                    <Link
                      href={`/companies?page=${page - 1}${search ? `&search=${search}` : ""}`}
                      className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-bold text-slate-300 transition-all hover:bg-slate-800 hover:text-white"
                    >
                      <ArrowRight className="h-4 w-4 rotate-180" />
                      Previous
                    </Link>
                  )}
                  {page * 12 < total && (
                    <Link
                      href={`/companies?page=${page + 1}${search ? `&search=${search}` : ""}`}
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-xl"
                    >
                      Next Page
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

