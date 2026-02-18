import Link from "next/link";
import { fetchVerifiableCompanies } from "@/lib/manager-api";
import { normalizeError } from "@/lib/errors";
import {
    SearchBar,
    FilterTabs,
    ErrorState,
    EmptyState,
    Pagination,
} from "@/components/shared";

const PAGE_SIZE = 15;

const STATUS_TABS = [
    { value: "", label: "All" },
    { value: "PENDING", label: "Pending" },
    { value: "VERIFIED", label: "Verified" },
    { value: "REJECTED", label: "Rejected" },
];

interface CompanyVerificationListProps {
    searchParams: {
        page?: string;
        verification_status?: string;
        search?: string;
    };
}

export default async function CompanyVerificationList({
    searchParams,
}: CompanyVerificationListProps) {
    const page = Number(searchParams.page) || 1;
    const status = searchParams.verification_status ?? "";
    const search = searchParams.search;

    let companies: Awaited<ReturnType<typeof fetchVerifiableCompanies>>["data"] =
        [];
    let total = 0;
    let error: string | null = null;

    try {
        const res = await fetchVerifiableCompanies({
            page,
            page_size: PAGE_SIZE,
            verification_status: status || undefined,
            search: search || undefined,
        });
        companies = res.data;
        total = res.total;
    } catch (err) {
        error = normalizeError(err, "Failed to load companies.");
    }

    function buildHref(overrides: Record<string, string | undefined>) {
        const params = new URLSearchParams();
        const merged = { verification_status: status, search, ...overrides };
        Object.entries(merged).forEach(([k, v]) => {
            if (v) params.set(k, v);
        });
        const qs = params.toString();
        return `/dashboard/companies${qs ? `?${qs}` : ""}`;
    }

    const verificationBadge: Record<string, string> = {
        PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-400",
        VERIFIED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        REJECTED: "border-red-500/30 bg-red-500/10 text-red-400",
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white">
                    Company Verification
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                    Review and verify companies · {total} total
                </p>
            </div>

            <SearchBar
                defaultValue={search}
                placeholder="Search companies…"
                color="purple"
                hiddenFields={{
                    verification_status: status || undefined,
                }}
            />

            <FilterTabs
                tabs={STATUS_TABS}
                activeValue={status}
                buildHref={(v) =>
                    buildHref({ verification_status: v || undefined, page: undefined })
                }
                activeColor="bg-purple-600"
            />

            {error && <ErrorState message={error} />}

            {!error && companies.length === 0 && (
                <EmptyState
                    icon="🏢"
                    heading="No companies found"
                    description="No companies matching your filters."
                />
            )}

            {!error && companies.length > 0 && (
                <div className="space-y-3">
                    {companies.map((company) => (
                        <Link
                            key={company.id}
                            href={`/dashboard/companies/${company.id}`}
                            className="block rounded-2xl border border-slate-800 bg-slate-900 p-5 transition-all hover:border-slate-700 hover:bg-slate-800/50"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    {company.logoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={company.logoUrl}
                                            alt={company.name}
                                            className="h-10 w-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-slate-400">
                                            {company.name.charAt(0)}
                                        </span>
                                    )}
                                    <div>
                                        <h3 className="font-medium text-white">{company.name}</h3>
                                        <p className="text-sm text-slate-400">{company.type}</p>
                                    </div>
                                </div>
                                <span
                                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${verificationBadge[company.verificationStatus] ??
                                        verificationBadge.PENDING
                                        }`}
                                >
                                    {company.verificationStatus}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            <Pagination
                page={page}
                total={total}
                pageSize={PAGE_SIZE}
                buildHref={(p) => buildHref({ page: String(p) })}
                showPageLabel
            />
        </div>
    );
}
