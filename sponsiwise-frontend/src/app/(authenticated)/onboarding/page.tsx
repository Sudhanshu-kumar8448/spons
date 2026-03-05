"use client";

import Link from "next/link";
import { Building2, Megaphone, ArrowRight, Sparkles, Zap } from "lucide-react";
import Logo from "@/components/logo/logo";

/**
 * /onboarding — Role Selection Page
 *
 * New users land here after registration.
 * Two options: "Start as Sponsor" or "Start as Organizer".
 */
export default function OnboardingPage() {
    return (
        <div className="min-h-screen bg-slate-50 px-4 py-12">
            {/* Navigation */}
            <nav className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        
                        <Logo />
                    </div>
                </div>
            </nav>

            <div className="relative z-10 w-full max-w-3xl mx-auto pt-32 sm:pt-40">
                {/* Header */}
                <div className="mb-10 text-center">
                    <div className="mb-4 inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100">
                        <Sparkles className="h-4 w-4" />
                        Welcome to Sponsiwise
                    </div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 mb-4">
                        How would you like to{" "}
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600">get started</span>?
                    </h1>
                    <p className="mt-4 text-base text-slate-500 sm:text-lg font-medium">
                        Choose your role to unlock the right tools and features for you.
                    </p>
                </div>

                {/* Cards */}
                <div className="grid gap-6 sm:grid-cols-2">
                    {/* Sponsor Card */}
                    <Link
                        href="onboarding/asBrand"
                        className="group relative bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-xl transition-all duration-300"
                    >
                        <div className="flex justify-between items-start mb-8 sm:mb-10">
                            <div>
                                <div className="w-12 sm:w-14 h-12 sm:h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                                    <Building2 className="text-indigo-600 w-6 sm:w-7 h-6 sm:h-7" />
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 mb-3">Start as Brand</h3>
                                <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                                    Register your company, sponsor events, and connect with
                                    organizers and audiences that align with your brand values.
                                </p>
                            </div>
                            <div className="bg-indigo-600 text-white p-3 sm:p-4 rounded-2xl shadow-xl shadow-indigo-100">
                                <ArrowRight className="w-5 sm:w-6 h-5 sm:h-6" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 transition-colors group-hover:text-indigo-700">
                            Get started
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                    </Link>

                    {/* Organizer Card */}
                    <Link
                        href="/onboarding/asOrganizer"
                        className="group relative bg-slate-900 p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden border border-slate-800 hover:border-slate-700 transition-all duration-300"
                    >
                        <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-indigo-600/20 blur-[100px] pointer-events-none"></div>
                        <div className="flex justify-between items-start mb-8 sm:mb-10 relative z-10">
                            <div>
                                <div className="w-12 sm:w-14 h-12 sm:h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                                    <Megaphone className="text-indigo-400 w-6 sm:w-7 h-6 sm:h-7" />
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-3">
                                    Start as Organizer
                                </h3>
                                <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                                    Create and manage events, attract brands, and grow your
                                    audience. 
                                </p>
                            </div>
                            <div className="bg-white text-slate-900 p-3 sm:p-4 rounded-2xl relative z-10">
                                <ArrowRight className="w-5 sm:w-6 h-5 sm:h-6" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-bold text-indigo-400 transition-colors group-hover:text-indigo-300 relative z-10">
                            Get started
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                    </Link>
                </div>

                {/* Footer */}
                <p className="text-center mt-8 text-xs text-slate-400">
                    Protected by Sponsiwise Protocol. Secure & encrypted.
                </p>
                
            </div>
        </div>
    );
}
