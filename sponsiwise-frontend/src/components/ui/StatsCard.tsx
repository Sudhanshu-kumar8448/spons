"use client";

import { ReactNode } from "react";
import AnimatedCounter from "./AnimatedCounter";

interface StatsCardProps {
    label: string;
    value: number | string;
    icon?: ReactNode;
    trend?: { value: number; label: string };
    variant?: "default" | "brand" | "success" | "warning" | "error";
    href?: string;
    prefix?: string;
    animate?: boolean;
}

const variantStyles = {
    default: {
        bg: "bg-white",
        iconBg: "bg-slate-100",
        iconColor: "text-slate-600",
    },
    brand: {
        bg: "bg-gradient-to-br from-brand-500 to-brand-400",
        iconBg: "bg-white/20",
        iconColor: "text-white",
    },
    success: {
        bg: "bg-white",
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
    },
    warning: {
        bg: "bg-white",
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
    },
    error: {
        bg: "bg-white",
        iconBg: "bg-red-50",
        iconColor: "text-red-600",
    },
};

export default function StatsCard({
    label,
    value,
    icon,
    trend,
    variant = "default",
    prefix,
    animate = true,
}: StatsCardProps) {
    const style = variantStyles[variant];
    const isBrand = variant === "brand";

    return (
        <div
            className={`
        rounded-[var(--radius-card)] ${style.bg}
        ${isBrand ? "text-white shadow-lg shadow-brand-500/20" : "border border-border-light shadow-[var(--shadow-card)]"}
        p-5 transition-all duration-300 hover-lift
      `}
        >
            <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                    <p
                        className={`text-xs font-medium uppercase tracking-wider ${isBrand ? "text-white/70" : "text-text-muted"}`}
                    >
                        {label}
                    </p>
                    <p
                        className={`mt-2 text-2xl font-bold ${isBrand ? "text-white" : "text-text-primary"}`}
                    >
                        {prefix && <span className="text-lg font-semibold">{prefix}</span>}
                        {animate && typeof value === "number" ? (
                            <AnimatedCounter value={value} />
                        ) : (
                            value
                        )}
                    </p>
                    {trend && (
                        <p
                            className={`mt-1.5 text-xs font-medium ${trend.value >= 0
                                    ? isBrand
                                        ? "text-white/80"
                                        : "text-emerald-600"
                                    : "text-red-500"
                                }`}
                        >
                            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%{" "}
                            {trend.label}
                        </p>
                    )}
                </div>
                {icon && (
                    <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.iconBg} ${style.iconColor}`}
                    >
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}
