"use client";

import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Clock, ShieldCheck, ArrowRight, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import Logo from "@/components/logo/logo";

export default function VerificationPendingPage() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await apiClient.post("/auth/logout", {});
    } catch {
      // ignore
    }
    router.push("/login");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-10 sm:px-6 sm:py-14 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Background accents */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-indigo-100/80 to-transparent" />
      <div className="pointer-events-none absolute -right-20 top-24 h-56 w-56 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-12 h-56 w-56 rounded-full bg-violet-200/40 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-lg flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full"
        >
          {/* Logo */}
          <div className="mb-10 flex justify-center">
            <Logo />
          </div>

          {/* Card */}
          <div className="rounded-[2rem] border border-slate-100 bg-white p-8 sm:p-10 shadow-sm text-center">
            {/* Icon */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50">
              <Clock className="h-10 w-10 text-indigo-600" />
            </div>

            {/* Heading */}
            <h1 className="mb-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Verification{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600">
                Pending
              </span>
            </h1>

            {/* Description */}
            <p className="mx-auto mb-8 max-w-sm text-sm sm:text-base text-slate-500 leading-relaxed">
              Your application has been submitted successfully and is now under
              review. Our team will verify your details and get back to you
              shortly.
            </p>

            {/* Status badge */}
            <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-indigo-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              Under Review
            </div>

            {/* Info cards */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 text-left">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-indigo-600">
                  What happens next?
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  A manager will review your submission and approve your account
                  within 24–48 hours.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-left">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-indigo-600">
                  Need help?
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Reach out to our support team if you have any questions about
                  the verification process.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <button
                onClick={() => router.push("/")}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white transition-colors hover:bg-indigo-600"
              >
                Back to Home <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 py-4 px-6 text-sm font-bold text-slate-500 transition-colors hover:border-red-200 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
