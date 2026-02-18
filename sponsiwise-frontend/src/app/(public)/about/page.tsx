"use client";

import Image from "next/image";
import Link from "next/link";
import {
    Heart,
    Shield,
    Users,
    Target,
    Zap,
    Globe,
    ArrowRight,
    Mail,
    MapPin,
    Phone,
    CheckCircle2,
} from "lucide-react";
import { MotionWrapper } from "@/components/ui";

const values = [
    {
        icon: <Shield className="h-6 w-6" />,
        title: "Trust & Transparency",
        description:
            "Every transaction, proposal, and partnership on our platform is built on a foundation of full visibility and honest communication.",
    },
    {
        icon: <Zap className="h-6 w-6" />,
        title: "Speed & Efficiency",
        description:
            "We eliminate the back-and-forth. Our streamlined workflows help you close deals faster and spend more time on what matters.",
    },
    {
        icon: <Heart className="h-6 w-6" />,
        title: "Community First",
        description:
            "We believe sponsorship is about building real relationships, not just transactions. Every feature we build strengthens those connections.",
    },
    {
        icon: <Globe className="h-6 w-6" />,
        title: "Global Reach",
        description:
            "From local meetups to international conferences, SponsiWise connects sponsors and events across every industry and region.",
    },
];

const teamMembers = [
    {
        name: "Kanha Singh",
        role: "Founder & CEO",
        description: "Visionary technologist passionate about connecting brands with meaningful events.",
    },
];

const milestones = [
    { year: "2024", title: "Idea Born", description: "The concept for SponsiWise was conceived to solve fragmented sponsorship management." },
    { year: "2025", title: "Platform Launch", description: "First version launched with core sponsorship management features." },
    { year: "2026", title: "Growth Phase", description: "500+ events managed, 1200+ sponsors onboarded, $10M+ in deals facilitated." },
];

export default function AboutPage() {
    return (
        <div className="overflow-hidden">
            {/* ── Hero ──────────────────────────────────────────── */}
            <section className="section-dark relative overflow-hidden py-20 sm:py-28">
                <div className="pointer-events-none absolute -left-40 top-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />

                <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid items-center gap-12 lg:grid-cols-2">
                        <div>
                            <MotionWrapper>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-300">
                                    About Us
                                </span>
                            </MotionWrapper>

                            <MotionWrapper delay={0.1}>
                                <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                                    We&apos;re Redefining{" "}
                                    <span className="gradient-text-bold">Sponsorships</span>
                                </h1>
                            </MotionWrapper>

                            <MotionWrapper delay={0.2}>
                                <p className="mt-6 max-w-lg text-lg font-medium leading-relaxed text-slate-300">
                                    SponsiWise was born from a simple frustration: sponsorship
                                    management is broken. We&apos;re building the platform that
                                    makes connecting sponsors with events seamless, transparent,
                                    and rewarding for everyone.
                                </p>
                            </MotionWrapper>

                            <MotionWrapper delay={0.3}>
                                <div className="mt-8 flex flex-wrap gap-6 text-sm font-bold text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-400" /> 500+
                                        Events
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />{" "}
                                        1,200+ Sponsors
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-400" /> $10M+
                                        Deals
                                    </span>
                                </div>
                            </MotionWrapper>
                        </div>

                        <MotionWrapper delay={0.2} direction="right">
                            <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-blue-500/20">
                                <Image
                                    src="/images/about-team.jpg"
                                    alt="SponsiWise team collaborating"
                                    width={600}
                                    height={400}
                                    className="h-auto w-full object-cover"
                                />
                                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
                            </div>
                        </MotionWrapper>
                    </div>
                </div>
            </section>

            {/* ── Mission ──────────────────────────────────────── */}
            <section className="bg-white py-20 sm:py-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid items-center gap-16 lg:grid-cols-2">
                        <MotionWrapper direction="left">
                            <div className="relative overflow-hidden rounded-2xl shadow-xl">
                                <Image
                                    src="/images/about-mission.jpg"
                                    alt="Our mission - connecting people"
                                    width={600}
                                    height={400}
                                    className="h-auto w-full object-cover"
                                />
                            </div>
                        </MotionWrapper>

                        <div>
                            <MotionWrapper direction="right">
                                <span className="inline-block rounded-full bg-blue-100 px-4 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
                                    Our Mission
                                </span>
                                <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                                    Making Sponsorship{" "}
                                    <span className="gradient-text-bold">Accessible</span> to All
                                </h2>
                                <p className="mt-5 text-base font-medium leading-relaxed text-slate-600">
                                    We believe every event deserves great sponsors, and every brand
                                    deserves meaningful partnerships. Our mission is to democratize
                                    sponsorship by building tools that remove barriers, increase
                                    transparency, and create win-win outcomes.
                                </p>
                                <p className="mt-4 text-base font-medium leading-relaxed text-slate-600">
                                    Whether you&apos;re organizing a local community meetup or a
                                    global tech conference, SponsiWise gives you the same
                                    powerful suite of tools to manage your sponsorship lifecycle
                                    from discovery to delivery.
                                </p>
                            </MotionWrapper>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Values ───────────────────────────────────────── */}
            <section className="bg-slate-50 py-20 sm:py-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <MotionWrapper>
                        <div className="mx-auto max-w-2xl text-center">
                            <span className="inline-block rounded-full bg-blue-100 px-4 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
                                Our Values
                            </span>
                            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                                What Drives Us Every Day
                            </h2>
                            <p className="mt-4 text-lg font-medium text-slate-600">
                                Our core principles guide every decision we make and every
                                feature we build.
                            </p>
                        </div>
                    </MotionWrapper>

                    <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {values.map((value, i) => (
                            <MotionWrapper key={value.title} delay={i * 0.1}>
                                <div className="group h-full rounded-2xl border-2 border-slate-100 bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-500/10">
                                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 text-white shadow-lg shadow-blue-500/25">
                                        {value.icon}
                                    </div>
                                    <h3 className="mt-5 text-lg font-black text-slate-900">
                                        {value.title}
                                    </h3>
                                    <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
                                        {value.description}
                                    </p>
                                </div>
                            </MotionWrapper>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Timeline / Milestones ────────────────────────── */}
            <section id="how-it-works" className="section-dark relative overflow-hidden py-20 sm:py-28">
                <div className="pointer-events-none absolute -right-32 top-0 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

                <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <MotionWrapper>
                        <div className="mx-auto max-w-2xl text-center">
                            <span className="inline-block rounded-full bg-blue-500/20 px-4 py-1 text-xs font-bold uppercase tracking-wider text-blue-300">
                                Our Journey
                            </span>
                            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                                Milestones That Define Us
                            </h2>
                        </div>
                    </MotionWrapper>

                    <div className="mt-16 grid gap-8 sm:grid-cols-3">
                        {milestones.map((milestone, i) => (
                            <MotionWrapper key={milestone.year} delay={i * 0.15}>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all duration-300 hover:border-blue-400/30 hover:bg-white/10">
                                    <span className="text-4xl font-black text-blue-400">
                                        {milestone.year}
                                    </span>
                                    <h3 className="mt-3 text-lg font-bold text-white">
                                        {milestone.title}
                                    </h3>
                                    <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
                                        {milestone.description}
                                    </p>
                                </div>
                            </MotionWrapper>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Team ─────────────────────────────────────────── */}
            <section id="careers" className="bg-white py-20 sm:py-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <MotionWrapper>
                        <div className="mx-auto max-w-2xl text-center">
                            <span className="inline-block rounded-full bg-blue-100 px-4 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
                                Team
                            </span>
                            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                                Meet the People Behind{" "}
                                <span className="gradient-text-bold">SponsiWise</span>
                            </h2>
                            <p className="mt-4 text-lg font-medium text-slate-600">
                                We&apos;re a passionate team of builders, designers, and problem
                                solvers.
                            </p>
                        </div>
                    </MotionWrapper>

                    <div className="mt-16 flex justify-center">
                        {teamMembers.map((member, i) => (
                            <MotionWrapper key={member.name} delay={i * 0.1}>
                                <div className="w-full max-w-sm rounded-2xl border-2 border-slate-100 bg-white p-8 text-center shadow-lg transition-all duration-300 hover:-translate-y-2 hover:border-blue-200 hover:shadow-2xl">
                                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-400 text-3xl font-black text-white shadow-lg shadow-blue-500/25">
                                        {member.name.charAt(0)}
                                    </div>
                                    <h3 className="mt-5 text-xl font-black text-slate-900">
                                        {member.name}
                                    </h3>
                                    <p className="mt-1 text-sm font-bold text-blue-600">
                                        {member.role}
                                    </p>
                                    <p className="mt-3 text-sm font-medium text-slate-600">
                                        {member.description}
                                    </p>
                                </div>
                            </MotionWrapper>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Contact ──────────────────────────────────────── */}
            <section id="contact" className="bg-slate-50 py-20 sm:py-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid items-start gap-16 lg:grid-cols-2">
                        <div>
                            <MotionWrapper>
                                <span className="inline-block rounded-full bg-blue-100 px-4 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
                                    Contact
                                </span>
                                <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                                    Get in Touch
                                </h2>
                                <p className="mt-4 text-base font-medium text-slate-600 leading-relaxed">
                                    Have questions about SponsiWise? Want to partner with us?
                                    We&apos;d love to hear from you.
                                </p>
                            </MotionWrapper>

                            <MotionWrapper delay={0.1}>
                                <div className="mt-8 space-y-5">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                            <Mail className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">Email</p>
                                            <p className="text-sm font-medium text-slate-600">
                                                hello@sponsiwise.com
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                            <MapPin className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">
                                                Location
                                            </p>
                                            <p className="text-sm font-medium text-slate-600">
                                                Remote-first, Global
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                            <Phone className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">
                                                Support
                                            </p>
                                            <p className="text-sm font-medium text-slate-600">
                                                support@sponsiwise.com
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </MotionWrapper>
                        </div>

                        <MotionWrapper delay={0.2} direction="right">
                            <div className="relative overflow-hidden rounded-2xl shadow-xl">
                                <Image
                                    src="/images/about-values.jpg"
                                    alt="Collaboration and teamwork"
                                    width={600}
                                    height={400}
                                    className="h-auto w-full object-cover"
                                />
                            </div>
                        </MotionWrapper>
                    </div>
                </div>
            </section>

            {/* ── CTA ──────────────────────────────────────────── */}
            <section className="section-dark relative overflow-hidden py-20 sm:py-28">
                <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />

                <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <MotionWrapper>
                        <div className="mx-auto max-w-3xl text-center">
                            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                                Ready to Join the{" "}
                                <span className="gradient-text-bold">SponsiWise</span>{" "}
                                Community?
                            </h2>
                            <p className="mx-auto mt-5 max-w-lg text-lg font-medium text-slate-400">
                                Whether you&apos;re a sponsor looking for events or an organizer
                                seeking partners, we&apos;re here to help.
                            </p>
                            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                                <Link
                                    href="/register"
                                    className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-10 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/30 transition-all duration-300 hover:-translate-y-1 hover:bg-blue-500 hover:shadow-xl"
                                >
                                    Get Started Free
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                </Link>
                                <Link
                                    href="/events"
                                    className="inline-flex items-center gap-2 rounded-xl border-2 border-white/20 px-10 py-4 text-base font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:border-white/40 hover:bg-white/5"
                                >
                                    Browse Events
                                </Link>
                            </div>
                        </div>
                    </MotionWrapper>
                </div>
            </section>
        </div>
    );
}
