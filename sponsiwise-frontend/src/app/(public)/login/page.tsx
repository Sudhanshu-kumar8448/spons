"use client";

import { Suspense, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient, ApiError } from "@/lib/api-client";
import { ArrowLeft, ArrowRight, Lock, Mail } from "lucide-react";
import { motion } from "framer-motion";
import Logo from "@/components/logo/logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
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

      // Force Next.js to re-fetch server components with the new cookies
      router.refresh();

      // Role-aware redirect - use callbackUrl if provided
      const { role, companyId } = result.user;

      const roleRedirects: Record<string, string> = {
        SPONSOR: "/brand/dashboard",
        ORGANIZER: "/organizer/dashboard",
        MANAGER: "/manager/dashboard",
        ADMIN: "/admin",
        SUPER_ADMIN: "/admin",
      };

      const callbackAllowedPrefixesByRole: Record<string, string[]> = {
        SPONSOR: ["/brand"],
        ORGANIZER: ["/organizer"],
        MANAGER: ["/manager"],
        ADMIN: ["/admin"],
        SUPER_ADMIN: ["/admin"],
        USER: ["/onboarding", "/sponsor/register", "/sponsor/pending", "/organizer/register"],
      };

      const safeCallback =
        typeof callbackUrl === "string" && callbackUrl.startsWith("/")
          ? callbackUrl
          : null;
      // Apply callback only if it belongs to the logged-in role's route space.
      if (safeCallback) {
        const allowedPrefixes = callbackAllowedPrefixesByRole[role] ?? [];
        const isAllowedCallback = allowedPrefixes.some(
          (prefix) => safeCallback === prefix || safeCallback.startsWith(prefix + "/"),
        );
        if (isAllowedCallback) {
          router.push(safeCallback);
          return;
        }
      }

      // Default role-based redirect
      const { organizerId } = result.user;
      if (role === "USER") {
        if (companyId || organizerId) {
          // User has a pending application (sponsor or organizer)
          router.push("/onboarding/pending");
        } else {
          // New user, needs onboarding
          router.push("/onboarding");
        }
      } else {
        router.push(roleRedirects[role] || "/brand/dashboard");
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
    <div className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-indigo-100/80 to-transparent" />
      <div className="pointer-events-none absolute -right-20 top-24 h-56 w-56 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-12 h-56 w-56 rounded-full bg-violet-200/40 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full rounded-[2rem] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40 sm:rounded-[2.5rem] sm:p-8"
        >
          <div className="mb-5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-indigo-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.12, duration: 0.28 }}
            className="mb-8 text-center"
          >
            <div className="mb-4 inline-flex justify-center">
              <Logo />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Welcome Back</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">Sign in to continue to your workspace.</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.25 }}
            >
              <label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.25 }}
            >
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-bold text-slate-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-bold text-indigo-600 transition-colors hover:text-indigo-700"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white"
                />
              </div>
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.25 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <>
                  Sign In <ArrowRight className="h-4 w-4" />
                </>
              )}
            </motion.button>
          </form>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-xs font-semibold uppercase tracking-wide text-slate-400">or</span>
            </div>
          </div>

          <p className="text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-bold text-indigo-600 transition-colors hover:text-indigo-700">
              Create one
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function LoginFormFallback() {
  return (
    <div className="relative min-h-screen bg-slate-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <div className="w-full rounded-[2rem] border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/40">
          <div className="animate-pulse space-y-5">
            <div className="mx-auto h-8 w-36 rounded-lg bg-slate-200" />
            <div className="mx-auto h-4 w-48 rounded bg-slate-100" />
            <div className="space-y-3">
              <div className="h-11 rounded-xl bg-slate-100" />
              <div className="h-11 rounded-xl bg-slate-100" />
            </div>
            <div className="h-11 rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
