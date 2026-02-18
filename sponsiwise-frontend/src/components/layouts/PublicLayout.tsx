"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

interface PublicLayoutProps {
  children: React.ReactNode;
}

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/events" },
  { label: "About", href: "/about" },
];

const footerLinks = {
  platform: [
    { label: "Events", href: "/events" },
    { label: "Companies", href: "/companies" },
    { label: "How It Works", href: "/about#how-it-works" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/about#contact" },
    { label: "Careers", href: "/about#careers" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/about#privacy" },
    { label: "Terms of Service", href: "/about#terms" },
  ],
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* ── Navbar ───────────────────────────────────── */}
      <header className="sticky top-0 z-50 glass-strong shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/images/logo-icon.svg"
              alt="SponsiWise"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
              Sponsi<span className="text-blue-500">Wise</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200
                  ${pathname === link.href
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }
                `}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition-all hover:text-blue-600"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-500 hover:shadow-lg active:scale-[0.97]"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50 md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="animate-fade-in border-t border-slate-100 bg-white px-4 pb-6 pt-4 md:hidden">
            <nav className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    block rounded-lg px-4 py-2.5 text-sm font-semibold transition-all
                    ${pathname === link.href
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50"
                    }
                  `}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border-2 border-blue-200 px-4 py-2.5 text-center text-sm font-bold text-blue-600 transition-all hover:bg-blue-50"
              >
                Log in
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-bold text-white shadow-md"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Main ─────────────────────────────────────── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="border-t border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2">
                <Image
                  src="/images/logo-icon.svg"
                  alt="SponsiWise"
                  width={32}
                  height={32}
                  className="h-8 w-8"
                />
                <span className="text-lg font-black text-white">
                  Sponsi<span className="text-blue-400">Wise</span>
                </span>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-400 leading-relaxed">
                The modern platform connecting sponsors with events. Simplify
                sponsorship management end-to-end.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h4 className="text-sm font-bold text-white">Platform</h4>
              <ul className="mt-3 space-y-2">
                {footerLinks.platform.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm font-medium text-slate-400 transition-colors hover:text-blue-400"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-bold text-white">Company</h4>
              <ul className="mt-3 space-y-2">
                {footerLinks.company.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm font-medium text-slate-400 transition-colors hover:text-blue-400"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-bold text-white">Legal</h4>
              <ul className="mt-3 space-y-2">
                {footerLinks.legal.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm font-medium text-slate-400 transition-colors hover:text-blue-400"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-6 sm:flex-row">
            <p className="text-sm font-medium text-slate-500">
              © 2026 SponsiWise. All rights reserved.
            </p>
            <div className="flex gap-4">
              <span className="text-sm font-medium text-slate-500">Made with 💙</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
