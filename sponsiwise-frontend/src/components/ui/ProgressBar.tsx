"use client";

interface ProgressBarProps {
    value: number;        // 0–100
    max?: number;
    label?: string;
    showPercent?: boolean;
    variant?: "brand" | "success" | "warning" | "error";
    size?: "sm" | "md" | "lg";
}

const variantGradients: Record<string, string> = {
    brand: "from-brand-500 to-brand-300",
    success: "from-emerald-500 to-emerald-400",
    warning: "from-amber-500 to-amber-400",
    error: "from-red-500 to-red-400",
};

const sizeClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
};

export default function ProgressBar({
    value,
    max = 100,
    label,
    showPercent = true,
    variant = "brand",
    size = "md",
}: ProgressBarProps) {
    const percent = Math.min(100, Math.max(0, (value / max) * 100));

    return (
        <div className="w-full">
            {(label || showPercent) && (
                <div className="mb-1.5 flex items-center justify-between">
                    {label && (
                        <span className="text-sm font-medium text-text-secondary">
                            {label}
                        </span>
                    )}
                    {showPercent && (
                        <span className="text-sm font-semibold text-text-primary">
                            {Math.round(percent)}%
                        </span>
                    )}
                </div>
            )}
            <div
                className={`w-full overflow-hidden rounded-full bg-surface-muted ${sizeClasses[size]}`}
            >
                <div
                    className={`${sizeClasses[size]} rounded-full bg-gradient-to-r ${variantGradients[variant]} transition-all duration-700 ease-out`}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}
