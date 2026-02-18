"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient, ApiError } from "@/lib/api-client";
import { Mail, Lock } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await apiClient.post<{ user: { role: string; companyId?: string | null; organizerId?: string | null } }>("/auth/login", { email, password });

      // Role-aware redirect
      const { role, companyId } = result.user;
      if (role === "USER") {
        if (companyId) {
          // User has a pending sponsor application
          router.push("/sponsor/pending");
        } else {
          // New user, needs onboarding
          router.push("/onboarding");
        }
      } else {
        // SPONSOR, ORGANIZER, MANAGER, ADMIN → dashboard
        router.push("/dashboard");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-[960px] overflow-hidden rounded-2xl border border-border-light shadow-2xl shadow-brand-500/5 sm:grid sm:grid-cols-2">
        {/* Left — Brand panel */}
        <div className="hidden sm:flex relative flex-col items-center justify-center bg-gradient-to-br from-brand-600 via-brand-500 to-brand-400 p-10 text-white">
          {/* Decorative */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-white/5" />

          <div className="relative text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Image src="/images/logo-icon.svg" alt="SponsiWise" width={40} height={40} />
            </div>
            <h2 className="text-3xl font-bold">Welcome Back</h2>
            <p className="mt-3 text-base text-blue-100/80 leading-relaxed">
              Sign in to manage your sponsorships, track proposals, and connect
              with the community.
            </p>
          </div>
        </div>

        {/* Right — Form */}
        <div className="bg-white p-8 sm:p-10">
          <div className="sm:hidden mb-6 text-center">
            <h1 className="text-2xl font-bold gradient-text">Welcome Back</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Sign in to your account
            </p>
          </div>

          <div className="hidden sm:block mb-8">
            <h1 className="text-2xl font-bold text-text-primary">Sign In</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Enter your credentials to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-text-secondary"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-[var(--radius-input)] border-2 border-border bg-white pl-10 pr-4 py-2.5 text-sm text-text-primary outline-none transition-all placeholder:text-text-muted hover:border-brand-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-text-secondary"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-[var(--radius-input)] border-2 border-border bg-white pl-10 pr-4 py-2.5 text-sm text-text-primary outline-none transition-all placeholder:text-text-muted hover:border-brand-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />
              </div>
            </div>

            {error && (
              <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[var(--radius-button)] bg-gradient-to-r from-brand-500 to-brand-400 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:from-brand-600 hover:to-brand-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-brand-500 transition-colors hover:text-brand-600"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
