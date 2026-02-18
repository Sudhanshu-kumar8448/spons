interface UserStatusBadgeProps {
    status?: string;
    isActive?: boolean;
}

/**
 * Badge for displaying user active/inactive status.
 * Accepts either a `status` string ("active"/"inactive") or `isActive` boolean.
 */
export default function UserStatusBadge({ status, isActive }: UserStatusBadgeProps) {
    const active = isActive ?? status === "active";

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${active
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-red-500/30 bg-red-500/10 text-red-400"
                }`}
        >
            <span
                className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-red-400"
                    }`}
            />
            {active ? "Active" : "Inactive"}
        </span>
    );
}
