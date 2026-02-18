"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Building2,
    Globe,
    FileText,
    ImageIcon,
    ArrowLeft,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";

/**
 * /sponsor/register — Sponsor Registration Form
 *
 * Collects company details and submits to POST /onboarding/sponsor.
 * On success → redirects to /sponsor/pending.
 */
export default function SponsorRegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [website, setWebsite] = useState("");
    const [description, setDescription] = useState("");
    const [logoUrl, setLogoUrl] = useState("");

    useEffect(() => {
        async function checkUserStatus() {
            try {
                const { user } = await apiClient.get<{ user: { companyId?: string | null; organizerId?: string | null } }>("/auth/me");

                if (user.organizerId) {
                    router.replace("/dashboard");
                    return;
                }

                if (user.companyId) {
                    router.replace("/sponsor/pending");
                    return;
                }
            } catch (err) {
                // middleware handles auth failures
            }
        }
        checkUserStatus();
    }, [router]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await apiClient.post("/onboarding/sponsor", {
                name: name.trim(),
                ...(website.trim() && { website: website.trim() }),
                ...(description.trim() && { description: description.trim() }),
                ...(logoUrl.trim() && { logoUrl: logoUrl.trim() }),
            });
            router.push("/sponsor/pending");
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.status === 409 && err.message?.includes("organizer")) {
                    router.push("/dashboard");
                    return;
                }
                if (err.status === 409 && err.message?.includes("company")) {
                    router.push("/sponsor/pending");
                    return;
                }
                setError(err.message);
            } else {
                setError("Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-4 py-12 overflow-hidden">
            {/* Decorative blurs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-lg animate-fade-in-up">
                {/* Back link */}
                <Link
                    href="/onboarding"
                    className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to role selection
                </Link>

                {/* Card */}
                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/70 p-8 backdrop-blur-sm">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-sky-500 shadow-lg shadow-blue-500/20">
                            <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">
                            Register as Sponsor
                        </h1>
                        <p className="mt-2 text-sm text-slate-400">
                            Tell us about your company. A manager will review your application
                            — usually within 24 hours.
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                            <p className="text-sm text-red-300">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Company Name */}
                        <div>
                            <label
                                htmlFor="name"
                                className="mb-1.5 block text-sm font-medium text-slate-300"
                            >
                                Company Name <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="name"
                                    type="text"
                                    required
                                    maxLength={255}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full rounded-xl border border-slate-600 bg-slate-700/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Acme Corporation"
                                />
                            </div>
                        </div>

                        {/* Website */}
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
                                    type="url"
                                    value={website}
                                    onChange={(e) => setWebsite(e.target.value)}
                                    className="w-full rounded-xl border border-slate-600 bg-slate-700/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="https://example.com"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label
                                htmlFor="description"
                                className="mb-1.5 block text-sm font-medium text-slate-300"
                            >
                                Description
                            </label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                <textarea
                                    id="description"
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full rounded-xl border border-slate-600 bg-slate-700/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                                    placeholder="Tell us about your company…"
                                />
                            </div>
                        </div>

                        {/* Logo URL */}
                        <div>
                            <label
                                htmlFor="logoUrl"
                                className="mb-1.5 block text-sm font-medium text-slate-300"
                            >
                                Logo URL
                            </label>
                            <div className="relative">
                                <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="logoUrl"
                                    type="url"
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    className="w-full rounded-xl border border-slate-600 bg-slate-700/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="https://example.com/logo.png"
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
                        >
                            {loading ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Submitting…
                                </span>
                            ) : (
                                "Submit Registration"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
