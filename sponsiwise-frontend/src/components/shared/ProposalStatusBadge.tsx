import type { ProposalStatus } from "@/lib/types/sponsor";

const statusConfig: Record<
    string,
    { label: string; className: string }
> = {
    draft: {
        label: "Draft",
        className:
            "border-slate-600 bg-slate-500/10 text-slate-300",
    },
    submitted: {
        label: "Submitted",
        className:
            "border-blue-500/30 bg-blue-500/10 text-blue-400",
    },
    under_review: {
        label: "Under Review",
        className:
            "border-amber-500/30 bg-amber-500/10 text-amber-400",
    },
    approved: {
        label: "Approved",
        className:
            "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    },
    rejected: {
        label: "Rejected",
        className: "border-red-500/30 bg-red-500/10 text-red-400",
    },
    withdrawn: {
        label: "Withdrawn",
        className:
            "border-slate-600 bg-slate-500/10 text-slate-400",
    },
};

interface ProposalStatusBadgeProps {
    status: ProposalStatus | string;
}

/**
 * Colour-coded pill for displaying proposal status.
 * Dark-theme friendly.
 */
export default function ProposalStatusBadge({
    status,
}: ProposalStatusBadgeProps) {
    const key = status.toLowerCase();
    const config = statusConfig[key] ?? {
        label: status,
        className: "border-slate-600 bg-slate-500/10 text-slate-400",
    };

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
        >
            {config.label}
        </span>
    );
}
