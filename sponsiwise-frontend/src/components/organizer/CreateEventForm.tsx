"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Calendar,
    MapPin,
    Users,
    Globe,
    Image,
    FileText,
    ArrowLeft,
    Loader2,
    Sparkles,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";

interface CreateEventFormProps {
    createAction: (formData: FormData) => Promise<{ error?: string }>;
}

export default function CreateEventForm({ createAction }: CreateEventFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const result = await createAction(formData);
            if (result?.error) {
                setError(result.error);
            } else {
                setSuccess(true);
                setTimeout(() => {
                    router.push("/dashboard/events");
                    router.refresh();
                }, 1000);
            }
        });
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-400 transition-all hover:border-slate-600 hover:bg-slate-700 hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white">Create New Event</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Fill in the details below to create your event. It will be reviewed
                        by a manager before being published.
                    </p>
                </div>
            </div>

            {/* Status messages */}
            {error && (
                <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
                    <p className="text-sm text-red-300">{error}</p>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                    <p className="text-sm text-emerald-300">
                        Event created successfully! Redirecting to your events…
                    </p>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <div className="mb-5 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-sky-500 shadow-lg shadow-blue-500/20">
                            <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">
                            Basic Information
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {/* Title */}
                        <div>
                            <label
                                htmlFor="title"
                                className="mb-1.5 block text-sm font-medium text-slate-300"
                            >
                                Event Title <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="title"
                                name="title"
                                type="text"
                                required
                                maxLength={255}
                                placeholder="e.g. Tech Innovation Summit 2026"
                                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label
                                htmlFor="description"
                                className="mb-1.5 block text-sm font-medium text-slate-300"
                            >
                                Description
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                rows={4}
                                placeholder="Tell sponsors what your event is about, who attends, what makes it special…"
                                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label
                                htmlFor="category"
                                className="mb-1.5 block text-sm font-medium text-slate-300"
                            >
                                Category
                            </label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="category"
                                    name="category"
                                    type="text"
                                    maxLength={100}
                                    placeholder="e.g. Technology, Sports, Music, Conference"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Location & Venue */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <div className="mb-5 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/20">
                            <MapPin className="h-4 w-4 text-white" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">
                            Location & Venue
                        </h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="location"
                                className="mb-1.5 block text-sm font-medium text-slate-300"
                            >
                                Location
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="location"
                                    name="location"
                                    type="text"
                                    maxLength={500}
                                    placeholder="e.g. San Francisco, CA"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="venue"
                                className="mb-1.5 block text-sm font-medium text-slate-300"
                            >
                                Venue
                            </label>
                            <input
                                id="venue"
                                name="venue"
                                type="text"
                                maxLength={255}
                                placeholder="e.g. Moscone Center"
                                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Date & Attendance */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <div className="mb-5 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 shadow-lg shadow-purple-500/20">
                            <Calendar className="h-4 w-4 text-white" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">
                            Date & Attendance
                        </h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <label
                                htmlFor="startDate"
                                className="mb-1.5 block text-sm font-medium text-slate-300"
                            >
                                Start Date <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="startDate"
                                    name="startDate"
                                    type="date"
                                    required
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-white transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="endDate"
                                className="mb-1.5 block text-sm font-medium text-slate-300"
                            >
                                End Date <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="endDate"
                                    name="endDate"
                                    type="date"
                                    required
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-white transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="expectedFootfall"
                                className="mb-1.5 block text-sm font-medium text-slate-300"
                            >
                                Expected Footfall <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="expectedFootfall"
                                    name="expectedFootfall"
                                    type="number"
                                    required
                                    min={0}
                                    placeholder="e.g. 5000"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Links */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <div className="mb-5 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-500 shadow-lg shadow-sky-500/20">
                            <Globe className="h-4 w-4 text-white" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">Links</h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="website"
                                className="mb-1.5 block text-sm font-medium text-slate-300"
                            >
                                Website
                            </label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="website"
                                    name="website"
                                    type="url"
                                    maxLength={500}
                                    placeholder="https://your-event.com"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="logoUrl"
                                className="mb-1.5 block text-sm font-medium text-slate-300"
                            >
                                Logo URL
                            </label>
                            <div className="relative">
                                <Image className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="logoUrl"
                                    name="logoUrl"
                                    type="url"
                                    maxLength={500}
                                    placeholder="https://example.com/logo.png"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info notice */}
                <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
                    <div>
                        <p className="text-sm font-medium text-amber-300">
                            Review Required
                        </p>
                        <p className="mt-0.5 text-xs text-amber-400/80">
                            Your event will be submitted for manager review. Once approved, it
                            will be visible to sponsors who can submit sponsorship proposals.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="rounded-xl border border-slate-700 px-6 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isPending || success}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 disabled:opacity-60 disabled:pointer-events-none"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Creating…
                            </>
                        ) : success ? (
                            <>
                                <CheckCircle2 className="h-4 w-4" />
                                Created!
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                Create Event
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
