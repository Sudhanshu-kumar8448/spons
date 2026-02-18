"use client";

import Link from "next/link";
import { Building2, Megaphone, ArrowRight, Sparkles } from "lucide-react";

/**
 * /onboarding — Role Selection Page
 *
 * New users land here after registration.
 * Two options: "Start as Sponsor" or "Start as Organizer".
 */
export default function OnboardingPage() {
    return (
        <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-4 py-12 overflow-hidden">
            {/* Decorative background elements */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
                <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/5 blur-2xl" />
            </div>

            <div className="relative z-10 w-full max-w-3xl animate-fade-in-up">
                {/* Header */}
                <div className="mb-10 text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-400">
                        <Sparkles className="h-4 w-4" />
                        Welcome to Sponsiwise
                    </div>
                    <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                        How would you like to{" "}
                        <span className="gradient-text">get started</span>?
                    </h1>
                    <p className="mt-4 text-base text-slate-400 sm:text-lg">
                        Choose your role to unlock the right tools and features for you.
                    </p>
                </div>

                {/* Cards */}
                <div className="grid gap-6 sm:grid-cols-2">
                    {/* Sponsor Card */}
                    <Link
                        href="/sponsor/register"
                        className="group relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/60 p-8 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/40 hover:bg-slate-800/80 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10"
                    >
                        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-sky-500 opacity-15 blur-2xl transition-opacity group-hover:opacity-25" />
                        <div className="relative">
                            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-sky-500 shadow-lg shadow-blue-500/20">
                                <Building2 className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Start as Sponsor</h3>
                            <p className="mt-3 text-sm leading-relaxed text-slate-400">
                                Register your company, sponsor events, and connect with
                                organizers. A manager will review your application.
                            </p>
                            <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-400 transition-colors group-hover:text-sky-300">
                                Get started
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </div>
                        </div>
                    </Link>

                    {/* Organizer Card */}
                    <Link
                        href="/organizer/register"
                        className="group relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/60 p-8 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/40 hover:bg-slate-800/80 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10"
                    >
                        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 opacity-15 blur-2xl transition-opacity group-hover:opacity-25" />
                        <div className="relative">
                            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20">
                                <Megaphone className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white">
                                Start as Organizer
                            </h3>
                            <p className="mt-3 text-sm leading-relaxed text-slate-400">
                                Create and manage events, attract sponsors, and grow your
                                audience. Instant access — no approval needed.
                            </p>
                            <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition-colors group-hover:text-teal-300">
                                Get started
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Footer hint */}
                <p className="mt-8 text-center text-xs text-slate-500">
                    Not sure yet?{" "}
                    <Link
                        href="/events"
                        className="text-blue-400 underline-offset-2 transition-colors hover:text-sky-300 hover:underline"
                    >
                        Browse events first
                    </Link>
                </p>
            </div>
        </div>
    );
}
