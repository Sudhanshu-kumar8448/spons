import { VerificationStatus } from "@/lib/types/manager";

const statusConfig: Record<
  VerificationStatus,
  { label: string; className: string }
> = {
  [VerificationStatus.PENDING]: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-400",
  },
  [VerificationStatus.VERIFIED]: {
    label: "Verified",
    className: "bg-emerald-500/10 text-emerald-400",
  },
  [VerificationStatus.REJECTED]: {
    label: "Rejected",
    className: "bg-red-500/10 text-red-400",
  },
};

interface VerificationStatusBadgeProps {
  status: VerificationStatus;
}

/**
 * Colour-coded pill for displaying verification status.
 * Server Component safe — no interactivity needed.
 */
export default function VerificationStatusBadge({
  status,
}: VerificationStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-slate-500/10 text-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
