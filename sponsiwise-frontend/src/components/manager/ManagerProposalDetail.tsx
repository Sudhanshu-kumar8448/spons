import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { fetchManagerProposalById, updateManagerProposal } from "@/lib/manager-api";
import { ProposalStatus } from "@/lib/types/sponsor";
import ProposalStatusBadge from "@/components/shared/ProposalStatusBadge";

// ─── Timeline ──────────────────────────────────────────────────────────

function ProposalTimeline({ proposal }: { proposal: any }) {
    const steps: { label: string; date: string | null; done: boolean }[] = [
        {
            label: "Created",
            date: proposal.createdAt,
            done: true,
        },
        {
            label: "Submitted",
            date: proposal.status !== ProposalStatus.DRAFT ? proposal.createdAt : null,
            done: proposal.status !== ProposalStatus.DRAFT,
        },
        {
            label: "Under Review",
            date: proposal.status === ProposalStatus.UNDER_MANAGER_REVIEW || proposal.status === ProposalStatus.FORWARDED_TO_ORGANIZER || proposal.status === ProposalStatus.APPROVED || proposal.status === ProposalStatus.REJECTED ? proposal.updatedAt : null,
            done: [ProposalStatus.UNDER_MANAGER_REVIEW, ProposalStatus.FORWARDED_TO_ORGANIZER, ProposalStatus.APPROVED, ProposalStatus.REJECTED].includes(proposal.status),
        },
        {
            label: "Forwarded to Organizer",
            date: proposal.status === ProposalStatus.FORWARDED_TO_ORGANIZER || proposal.status === ProposalStatus.APPROVED ? proposal.updatedAt : null,
            done: [ProposalStatus.FORWARDED_TO_ORGANIZER, ProposalStatus.APPROVED].includes(proposal.status),
        }
    ];

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Timeline
            </h3>
            <ol className="space-y-3">
                {steps.map((step) => (
                    <li key={step.label} className="flex items-start gap-3">
                        <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step.done
                                ? "bg-blue-600 text-white"
                                : "border-2 border-gray-300 text-gray-400"
                                }`}
                        >
                            {step.done ? "✓" : "·"}
                        </span>
                        <div>
                            <p
                                className={`text-sm font-medium ${step.done ? "text-gray-900" : "text-gray-400"}`}
                            >
                                {step.label}
                            </p>
                            {step.date && (
                                <p className="text-xs text-gray-500">
                                    {new Date(step.date).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            )}
                        </div>
                    </li>
                ))}
            </ol>
        </div>
    );
}

// ─── Main component ────────────────────────────────────────────────────

export default async function ManagerProposalDetail({
    id,
}: {
    id: string;
}) {
    const proposal = await fetchManagerProposalById(id).catch(() => null);

    if (!proposal) {
        notFound();
    }

    const isReviewable =
        proposal.status === ProposalStatus.SUBMITTED ||
        proposal.status === ProposalStatus.UNDER_MANAGER_REVIEW;

    async function handleManagerReviewAction(formData: FormData) {
        "use server";
        const action = formData.get("action") as string;
        const amountStr = formData.get("proposedAmount") as string;
        const tier = formData.get("proposedTier") as string;
        const notes = formData.get("notes") as string;

        const payload: any = {};
        if (amountStr) payload.proposedAmount = Number(amountStr);
        if (tier) payload.proposedTier = tier;
        if (notes) payload.notes = notes;

        if (action === "forward") {
            payload.status = ProposalStatus.FORWARDED_TO_ORGANIZER;
        } else if (action === "reject") {
            payload.status = ProposalStatus.REJECTED;
        } else if (action === "request_changes") {
            payload.status = ProposalStatus.REQUEST_CHANGES;
        } else if (action === "save") {
            payload.status = ProposalStatus.UNDER_MANAGER_REVIEW;
        }

        try {
            await updateManagerProposal(id, payload);
            revalidatePath(`/manager/proposals/${id}`);
            revalidatePath(`/manager/proposals`);
        } catch (e: any) {
            console.error("Failed to update proposal", e.message);
        }
    }

    return (
        <div className="space-y-8">
            <Link
                href="/manager/proposals"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
                ← Back to proposals
            </Link>

            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">
                            Sponsorship Proposal Review
                        </h1>
                        <ProposalStatusBadge status={proposal.status} />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                        From{" "}
                        <span className="font-medium text-gray-900">
                            {proposal.sponsorship?.company?.name}
                        </span>{" "}
                        for{" "}
                        <Link
                            href={`/manager/liveEvents/${proposal.sponsorship?.eventId}`}
                            className="font-medium text-blue-600 hover:text-blue-800"
                        >
                            {proposal.sponsorship?.event?.title}
                        </Link>
                    </p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main content */}
                <div className="space-y-6 lg:col-span-2">

                    {/* Initial Proposal Content */}
                    <div className="rounded-xl bg-white p-6 shadow">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Initial Proposal Details
                        </h2>
                        <p className="mt-3 whitespace-pre-line text-sm text-gray-600">
                            {proposal.message || "No message provided by sponsor."}
                        </p>
                    </div>

                    <div className="rounded-xl bg-white p-6 shadow">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Financial & Tier Target
                        </h2>

                        <form action={handleManagerReviewAction} className="space-y-6">
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="proposedAmount" className="text-xs font-medium uppercase tracking-wider text-gray-500">
                                        Proposed Amount ($)
                                    </label>
                                    <input
                                        type="number"
                                        id="proposedAmount"
                                        name="proposedAmount"
                                        defaultValue={proposal.proposedAmount || proposal.sponsorship?.tier?.askingPrice || ""}
                                        disabled={!isReviewable}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="proposedTier" className="text-xs font-medium uppercase tracking-wider text-gray-500">
                                        Target Tier
                                    </label>
                                    <select
                                        id="proposedTier"
                                        name="proposedTier"
                                        defaultValue={proposal.proposedTier || proposal.tier?.tierType || ""}
                                        disabled={!isReviewable}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
                                    >
                                        <option value="">Select Tier...</option>
                                        {proposal.sponsorship?.event?.tiers?.map((t: any) => (
                                            <option key={t.id} value={t.tierType}>
                                                {t.tierType} (${Number(t.askingPrice).toLocaleString()})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="notes" className="text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Manager Review Notes
                                </label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    rows={4}
                                    defaultValue={proposal.notes || ""}
                                    disabled={!isReviewable}
                                    placeholder="Add internal notes or instructions for the organizer..."
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
                                />
                            </div>

                            {isReviewable && (
                                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
                                    <button
                                        type="submit"
                                        name="action"
                                        value="save"
                                        className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                    >
                                        Save Draft
                                    </button>
                                    <button
                                        type="submit"
                                        name="action"
                                        value="request_changes"
                                        className="inline-flex justify-center rounded-md border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700 shadow-sm hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                                    >
                                        Request Changes from Sponsor
                                    </button>
                                    <div className="flex-1" />
                                    <button
                                        type="submit"
                                        name="action"
                                        value="reject"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                    >
                                        Reject Proposal
                                    </button>
                                    <button
                                        type="submit"
                                        name="action"
                                        value="forward"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                    >
                                        Approve & Forward to Organizer
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                {/* Sidebar */}
                <aside className="space-y-6">
                    {/* Sponsor info */}
                    <div className="rounded-xl bg-white p-6 shadow">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                            Sponsor Company
                        </h3>
                        <div className="mt-4 flex items-center gap-3">
                            {proposal.sponsorship?.company?.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={proposal.sponsorship.company.logoUrl}
                                    alt={proposal.sponsorship.company.name}
                                    className="h-10 w-10 rounded-full object-cover"
                                />
                            ) : (
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-500">
                                    {proposal.sponsorship?.company?.name?.charAt(0)}
                                </span>
                            )}
                            <div>
                                <p className="font-medium text-gray-900">
                                    {proposal.sponsorship?.company?.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {proposal.sponsorship?.company?.website}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Organizer info */}
                    <div className="rounded-xl bg-white p-6 shadow">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                            Organizer
                        </h3>
                        <div className="mt-4 text-sm">
                            <p className="font-medium text-gray-900">
                                {proposal.sponsorship?.event?.organizer?.name}
                            </p>
                            <p className="text-gray-500">
                                {proposal.sponsorship?.event?.organizer?.contactEmail}
                            </p>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="rounded-xl bg-white p-6 shadow">
                        <ProposalTimeline proposal={proposal} />
                    </div>
                </aside>
            </div>
        </div>
    );
}
