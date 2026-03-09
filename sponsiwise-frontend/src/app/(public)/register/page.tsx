"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient, ApiError } from "@/lib/api-client";
import { ArrowLeft, ArrowRight, Lock, Mail, UserPlus, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import Logo from "@/components/logo/logo";

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*[^A-Za-z0-9]).{8,}$/;

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const isPasswordStrong = PASSWORD_REGEX.test(password);
  const isConfirmPasswordValid = confirmPassword.length > 0 && password === confirmPassword;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!PASSWORD_REGEX.test(password)) {
      setError("Password should be at least 8 characters long with one alphabet and one special character.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }

    setLoading(true);

    try {
      await apiClient.post("/auth/register", { email, password });
      // Force Next.js to re-fetch server components with the new cookies
      router.refresh();
      router.push("/verify-email-pending");
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
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Create Your Account</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">Start exploring verified sponsorship opportunities.</p>
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
              <label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <p className={`mt-2 text-xs font-semibold ${isPasswordStrong ? "text-emerald-600" : "text-amber-600"}`}>
                  {isPasswordStrong
                    ? "Password format looks good."
                    : "Password should be 8 characters long, one special character, one alphabet."}
                </p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.25 }}
            >
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-bold text-slate-700">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && !isConfirmPasswordValid && (
                <p className="mt-2 text-xs font-semibold text-red-600">Passwords do not match.</p>
              )}
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
              transition={{ delay: 0.31, duration: 0.25 }}
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
                  Creating account...
                </span>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create Account <ArrowRight className="h-4 w-4" />
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
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-indigo-600 transition-colors hover:text-indigo-700">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
