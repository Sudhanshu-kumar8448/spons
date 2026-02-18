import type { ProposalStatus } from "@/lib/types/sponsor";

const statusConfig: Record<
  ProposalStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700",
  },
  submitted: {
    label: "Submitted",
    className: "bg-blue-100 text-blue-700",
  },
  under_review: {
    label: "Under Review",
    className: "bg-yellow-100 text-yellow-800",
  },
  approved: {
    label: "Approved",
    className: "bg-green-100 text-green-700",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-700",
  },
  withdrawn: {
    label: "Withdrawn",
    className: "bg-gray-100 text-gray-500",
  },
};

interface ProposalStatusBadgeProps {
  status: ProposalStatus;
}

/**
 * Colour-coded pill for displaying proposal status.
 * Server Component safe — no interactivity needed.
 */
export default function ProposalStatusBadge({
  status,
}: ProposalStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
