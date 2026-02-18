"use client";

import Link from "next/link";
import { PartyPopper, Clock, Calendar, ArrowRight } from "lucide-react";

/**
 * /sponsor/pending — Sponsor Pending Approval Page
 *
 * Shown after a user submits a sponsor registration.
 * Their company is now PENDING manager verification.
 */
export default function SponsorPendingPage() {
    return (
        <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-4 py-12 overflow-hidden">
            {/* Decorative blurs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md animate-fade-in-up text-center">
                {/* Success icon */}
                <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-2xl shadow-amber-500/30 animate-float">
                    <PartyPopper className="h-10 w-10 text-white" />
                </div>

                <h1 className="text-3xl font-bold text-white sm:text-4xl">
                    🎉 Congratulations!
                </h1>

                <p className="mt-4 text-base text-slate-400 leading-relaxed">
                    Your sponsor application has been submitted successfully. A manager
                    will review your company profile shortly.
                </p>

                {/* Status card */}
                <div className="mt-8 rounded-2xl border border-slate-700/50 bg-slate-800/60 p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-center gap-3 text-amber-400">
                        <Clock className="h-5 w-5" />
                        <span className="text-sm font-semibold">Application Under Review</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                        You&apos;ll get full sponsor access once a manager approves your
                        company. This usually takes less than 24 hours.
                    </p>
                </div>

                {/* CTA */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link
                        href="/events"
                        className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
                    >
                        <Calendar className="h-4 w-4" />
                        Browse Events
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>

                <p className="mt-6 text-xs text-slate-500">
                    Questions?{" "}
                    <Link
                        href="/contact"
                        className="text-blue-400 underline-offset-2 hover:underline"
                    >
                        Contact support
                    </Link>
                </p>
            </div>
        </div>
    );
}
