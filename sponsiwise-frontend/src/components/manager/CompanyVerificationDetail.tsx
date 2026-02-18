import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchVerifiableCompanyById, verifyCompany } from "@/lib/manager-api";

interface CompanyVerificationDetailProps {
    id: string;
}

export default async function CompanyVerificationDetail({
    id,
}: CompanyVerificationDetailProps) {
    let company: Awaited<ReturnType<typeof fetchVerifiableCompanyById>> | null =
        null;
    let error: string | null = null;

    try {
        company = await fetchVerifiableCompanyById(id);
    } catch {
        notFound();
    }

    if (!company) notFound();

    const verificationBadge: Record<string, { label: string; cls: string }> = {
        PENDING: {
            label: "⏳ Pending",
            cls: "bg-yellow-100 text-yellow-700",
        },
        VERIFIED: {
            label: "✅ Verified",
            cls: "bg-green-100 text-green-700",
        },
        REJECTED: {
            label: "❌ Rejected",
            cls: "bg-red-100 text-red-700",
        },
    };

    const badge =
        verificationBadge[company.verificationStatus] ?? verificationBadge.PENDING;

    return (
        <div className="space-y-8">
            <Link
                href="/dashboard/companies"
                className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
            >
                ← Back to companies
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    {company.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={company.logoUrl}
                            alt={company.name}
                            className="h-14 w-14 rounded-full object-cover"
                        />
                    ) : (
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-lg font-bold text-slate-400">
                            {company.name.charAt(0)}
                        </span>
                    )}
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-white">{company.name}</h1>
                            <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}
                            >
                                {badge.label}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-400">
                            {company.type}
                            {company.website && (
                                <>
                                    {" · "}
                                    <a
                                        href={company.website}
                                        className="text-blue-400 hover:underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {company.website}
                                    </a>
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Details */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Company Details
                </h3>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                        <dt className="text-xs text-slate-500">Description</dt>
                        <dd className="mt-1 text-sm text-slate-300">
                            {company.description || "—"}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-slate-500">Created</dt>
                        <dd className="mt-1 text-sm text-slate-300">
                            {new Date(company.createdAt).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                            })}
                        </dd>
                    </div>
                </dl>
            </div>

            {/* Lifecycle link */}
            <Link
                href={`/dashboard/companies/${id}/lifecycle`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white"
            >
                📊 View Lifecycle
            </Link>
        </div>
    );
}
