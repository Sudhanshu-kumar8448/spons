"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Zap,
  Target,
  BarChart3,
  Users,
  Calendar,
  Shield,
  ChevronRight,
  Star,
  TrendingUp,
  Award,
  CheckCircle2,
} from "lucide-react";
import { MotionWrapper } from "@/components/ui";

// ─── Feature data ──────────────────────────────────────────────────────

const features = [
  {
    icon: <Target className="h-6 w-6" />,
    title: "For Sponsors",
    description:
      "Discover events that align with your brand. Manage proposals, track ROI, and build lasting partnerships effortlessly.",
    color: "from-blue-600 to-blue-400",
    image: "/images/feature-sponsors.jpg",
  },
  {
    icon: <Calendar className="h-6 w-6" />,
    title: "For Organizers",
    description:
      "Attract the right sponsors for your events. Streamline communication and close deals faster than ever.",
    color: "from-blue-700 to-blue-500",
    image: "/images/feature-organizers.jpg",
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "For Managers",
    description:
      "Oversee your portfolio with powerful dashboards. Monitor approvals, verification, and performance in real-time.",
    color: "from-blue-500 to-cyan-400",
    image: "/images/feature-managers.jpg",
  },
];

const steps = [
  {
    step: "01",
    title: "Sign Up",
    description:
      "Create your free account in seconds. Choose your role — sponsor, organizer, or both.",
    icon: <Users className="h-6 w-6" />,
  },
  {
    step: "02",
    title: "Discover & Connect",
    description:
      "Browse events, explore sponsorship tiers, and find the perfect match for your brand or event.",
    icon: <Target className="h-6 w-6" />,
  },
  {
    step: "03",
    title: "Submit & Track",
    description:
      "Send proposals, manage negotiations, and track every stage of your sponsorship lifecycle.",
    icon: <TrendingUp className="h-6 w-6" />,
  },
];

const stats = [
  { value: "500+", label: "Events Managed", icon: <Calendar className="h-5 w-5" /> },
  { value: "1,200+", label: "Active Sponsors", icon: <Users className="h-5 w-5" /> },
  { value: "98%", label: "Satisfaction Rate", icon: <Award className="h-5 w-5" /> },
  { value: "$10M+", label: "Deals Closed", icon: <TrendingUp className="h-5 w-5" /> },
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Marketing Director, TechVentures",
    quote:
      "Sponsiwise transformed how we manage event partnerships. The ROI tracking alone saved us 20+ hours per quarter.",
    rating: 5,
    avatar: "/images/avatar-1.jpg",
  },
  {
    name: "Raj Patel",
    role: "Event Organizer, DevConf",
    quote:
      "Finding quality sponsors was always a headache. With Sponsiwise, we filled all our tiers in record time.",
    rating: 5,
    avatar: "/images/avatar-2.jpg",
  },
  {
    name: "Emily Rodriguez",
    role: "Brand Manager, NovaCorp",
    quote:
      "The platform&apos;s transparency and lifecycle tracking gives us complete confidence in every partnership.",
    rating: 5,
    avatar: "/images/avatar-3.jpg",
  },
];

const trustedBrands = [
  "TechVentures",
  "DevConf",
  "NovaCorp",
  "EventPro",
  "BrandSync",
  "SponsorHub",
];

// ─── Page ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* ── Hero — Dark Bold ──────────────────────────────── */}
      <section className="relative min-h-[600px] overflow-hidden lg:min-h-[700px]">
        
        

        {/* Decorative floating elements */}
        <div className="pointer-events-none absolute -left-40 top-20 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 bottom-20 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />

<div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 py-16 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-24">
          <div className="max-w-2xl">

            {/* here we have write something else */}
            {/* <MotionWrapper>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-300">
                <Zap className="h-3.5 w-3.5" />
                Sponsorship made simple
              </span>
            </MotionWrapper> */}

            <MotionWrapper delay={0.1}>
              <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
                
                <span className="gradient-text-bold"> Connect Sponsors</span>
                <br />
                
                <span className="gradient-text-bold">With Events</span>
              </h1>
            </MotionWrapper>

            <MotionWrapper delay={0.1}>
              <p className="mt-4 text-base font-medium leading-relaxed text-black-600 sm:mt-6 sm:text-lg">
                Sponsiwise is the trusted platform that makes sponsorship
                management effortless. Find events to sponsor, or attract
                sponsors to your events — all in one place.
              </p>
            </MotionWrapper>

            <MotionWrapper delay={0.2}>
              <div className="mt-8 flex flex-col gap-4 sm:mt-10 sm:flex-row">
                <Link
                  href="/register"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-500/40"
                >
                  Connect with us
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/register"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-500/40"
                >
                  Explore Events
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </MotionWrapper>

            {/* Trust indicators */}
            <MotionWrapper delay={0.4}>
              <div className="mt-8 flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-400 sm:mt-12 sm:gap-6">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-emerald-400" /> Verified
                  Partners
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-blue-400" /> 1000+ Users
                </span>
                <span className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-amber-400" /> 4.9/5 Rating
                </span>
              </div>
            </MotionWrapper>
          </div>
          
          {/* Video Section */}
          <div className="w-full">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-full rounded-2xl shadow-2xl shadow-blue-500/20 ring-1 ring-white/10"
            >
              <source src="/videos/chintu.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────── */}
      <section className="relative -mt-1 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.08)_0%,transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <MotionWrapper key={stat.label} delay={i * 0.1}>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white">
                    {stat.icon}
                  </div>
                  <span className="text-3xl font-black text-white sm:text-4xl">
                    {stat.value}
                  </span>
                  <span className="mt-1 text-sm font-semibold text-blue-100/80">
                    {stat.label}
                  </span>
                </div>
              </MotionWrapper>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MotionWrapper>
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-block rounded-full bg-blue-100 px-4 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
                Features
              </span>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Why{" "}
                <span className="gradient-text-bold">Sponsiwise</span>?
              </h2>
              <p className="mt-4 text-lg font-medium text-slate-600">
                Everything you need to manage sponsorships — whether you&apos;re
                funding, organizing, or overseeing.
              </p>
            </div>
          </MotionWrapper>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {features.map((feature, i) => (
              <MotionWrapper key={feature.title} delay={i * 0.1}>
                <div className="card-img-zoom group overflow-hidden rounded-2xl border-2 border-slate-100 bg-white shadow-lg transition-all duration-300 hover:-translate-y-2 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-500/10">
                  {/* Feature image */}
                  <div className="relative h-48 w-full overflow-hidden">
                    <Image
                      src={feature.image}
                      alt={feature.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                  </div>
                  <div className="p-8">
                    <div
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} text-white shadow-lg`}
                    >
                      {feature.icon}
                    </div>
                    <h3 className="mt-5 text-xl font-black text-slate-900">
                      {feature.title}
                    </h3>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </MotionWrapper>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works — Dark Section ───────────────────── */}
      <section className="section-dark relative overflow-hidden py-20 sm:py-28">
        {/* Decorative background */}
        <div className="pointer-events-none absolute -left-32 top-0 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* Left — Image */}
            <MotionWrapper direction="left">
              <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-blue-500/20">
                <Image
                  src="/images/how-it-works.jpg"
                  alt="Team collaborating at an event"
                  width={600}
                  height={400}
                  className="h-auto w-full object-cover"
                />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
              </div>
            </MotionWrapper>

            {/* Right — Steps */}
            <div>
              <MotionWrapper direction="right">
                <span className="inline-block rounded-full bg-blue-500/20 px-4 py-1 text-xs font-bold uppercase tracking-wider text-blue-300">
                  How It Works
                </span>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Get Started in{" "}
                  <span className="gradient-text-bold">3 Simple Steps</span>
                </h2>
              </MotionWrapper>

              <div className="mt-10 space-y-8">
                {steps.map((step, i) => (
                  <MotionWrapper key={step.step} delay={i * 0.15} direction="right">
                    <div className="group flex gap-5 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:border-blue-400/30 hover:bg-white/10">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 text-white shadow-lg shadow-blue-500/25">
                        {step.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-400">
                            STEP {step.step}
                          </span>
                        </div>
                        <h3 className="mt-1 text-lg font-bold text-white">
                          {step.title}
                        </h3>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </MotionWrapper>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────── */}
      <section className="bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MotionWrapper>
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-block rounded-full bg-blue-100 px-4 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
                Testimonials
              </span>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Loved by Teams Everywhere
              </h2>
              <p className="mt-4 text-lg font-medium text-slate-600">
                See what our users have to say about Sponsiwise
              </p>
            </div>
          </MotionWrapper>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {testimonials.map((t, i) => (
              <MotionWrapper key={t.name} delay={i * 0.1}>
                <div className="flex h-full flex-col rounded-2xl border-2 border-slate-100 bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-500/10">
                  {/* Stars */}
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, si) => (
                      <Star
                        key={si}
                        className="h-5 w-5 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  <p className="mt-5 flex-1 text-base font-medium leading-relaxed text-slate-700">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-6 flex items-center gap-4 border-t-2 border-slate-100 pt-5">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-blue-100">
                      <Image
                        src={t.avatar}
                        alt={t.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {t.name}
                      </p>
                      <p className="text-xs font-semibold text-slate-500">
                        {t.role}
                      </p>
                    </div>
                  </div>
                </div>
              </MotionWrapper>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trusted By ───────────────────────────────────── */}
      <section className="border-y-2 border-slate-100 bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MotionWrapper>
            <p className="text-center text-sm font-bold uppercase tracking-widest text-slate-400">
              Trusted by leading organizations
            </p>
          </MotionWrapper>
          <MotionWrapper delay={0.1}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
              {trustedBrands.map((brand) => (
                <span
                  key={brand}
                  className="text-xl font-black tracking-tight text-slate-300 transition-colors hover:text-blue-500"
                >
                  {brand}
                </span>
              ))}
            </div>
          </MotionWrapper>
        </div>
      </section>

      {/* ── CTA — Bold Dark ──────────────────────────────── */}
      <section className="section-dark relative overflow-hidden py-20 sm:py-28">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MotionWrapper>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                Ready to Transform Your{" "}
                <span className="gradient-text-bold">Sponsorships</span>?
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-lg font-medium text-slate-400">
                Create your free account and explore what Sponsiwise can do for
                you. No credit card required.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-10 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/30 transition-all duration-300 hover:-translate-y-1 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-500/40"
                >
                  Sign up for free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/events"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-white/20 px-10 py-4 text-base font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:border-white/40 hover:bg-white/5"
                >
                  Browse Events
                </Link>
              </div>

              {/* Trust checkmarks */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Free
                  forever plan
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> No
                  credit card needed
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Cancel
                  anytime
                </span>
              </div>
            </div>
          </MotionWrapper>
        </div>
      </section>
    </div>
  );
}
