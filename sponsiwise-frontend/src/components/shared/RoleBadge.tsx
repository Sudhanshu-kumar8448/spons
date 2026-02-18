interface RoleBadgeProps {
    role: string;
}

const roleColors: Record<string, string> = {
    ADMIN: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    SUPER_ADMIN: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    MANAGER: "border-purple-500/30 bg-purple-500/10 text-purple-400",
    ORGANIZER: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    SPONSOR: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    USER: "border-slate-600 bg-slate-500/10 text-slate-400",
};

/**
 * Colour-coded pill for displaying user role.
 */
export default function RoleBadge({ role }: RoleBadgeProps) {
    const color =
        roleColors[role.toUpperCase()] ||
        "border-slate-600 bg-slate-500/10 text-slate-400";

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${color}`}
        >
            {role.toLowerCase().replace("_", " ")}
        </span>
    );
}
