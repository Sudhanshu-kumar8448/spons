import { ReactNode } from "react";

type BadgeVariant = "info" | "success" | "warning" | "error" | "neutral" | "brand";

interface BadgeProps {
    variant?: BadgeVariant;
    children: ReactNode;
    className?: string;
    dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
    info: "bg-blue-50 text-blue-700 border-blue-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    error: "bg-red-50 text-red-700 border-red-200",
    neutral: "bg-slate-100 text-slate-600 border-slate-200",
    brand: "bg-brand-50 text-brand-600 border-brand-200",
};

const dotColors: Record<BadgeVariant, string> = {
    info: "bg-blue-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-red-500",
    neutral: "bg-slate-400",
    brand: "bg-brand-500",
};

export default function Badge({
    variant = "neutral",
    children,
    className = "",
    dot = false,
}: BadgeProps) {
    return (
        <span
            className={`
        inline-flex items-center gap-1.5
        rounded-[var(--radius-badge)] border
        px-2.5 py-0.5 text-xs font-medium
        ${variantClasses[variant]}
        ${className}
      `}
        >
            {dot && (
                <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />
            )}
            {children}
        </span>
    );
}
