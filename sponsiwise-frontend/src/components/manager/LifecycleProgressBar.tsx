import type { LifecycleProgress } from "@/lib/types/manager";

interface LifecycleProgressBarProps {
    progress: LifecycleProgress;
    hasFailed?: boolean;
}

/**
 * Horizontal progress bar with step indicators for lifecycle views.
 */
export default function LifecycleProgressBar({
    progress,
    hasFailed = false,
}: LifecycleProgressBarProps) {
    const percentage = Math.min(100, Math.max(0, progress.percentage));

    return (
        <div className="rounded-xl bg-white p-6 shadow">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                    {progress.label || "Lifecycle Progress"}
                </h3>
                <span
                    className={`text-sm font-bold ${hasFailed ? "text-red-600" : "text-blue-600"
                        }`}
                >
                    {percentage}%
                </span>
            </div>

            {/* Bar */}
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${hasFailed
                            ? "bg-gradient-to-r from-red-400 to-red-500"
                            : "bg-gradient-to-r from-blue-500 to-sky-400"
                        }`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            {/* Steps */}
            {progress.steps && progress.steps.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                    {progress.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                            <span
                                className={`h-2.5 w-2.5 rounded-full ${step.completed ? "bg-green-500" : "bg-gray-300"
                                    }`}
                            />
                            <span
                                className={`text-xs ${step.completed
                                        ? "font-medium text-green-700"
                                        : "text-gray-500"
                                    }`}
                            >
                                {step.label}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
