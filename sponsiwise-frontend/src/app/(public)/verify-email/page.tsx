"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient, ApiError } from "@/lib/api-client";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import Logo from "@/components/logo/logo";

type Status = "loading" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link. No token provided.");
      return;
    }

    async function verify() {
      try {
        const result = await apiClient.get<{ message: string }>(
          `/auth/verify-email?token=${encodeURIComponent(token!)}`,
        );
        setStatus("success");
        setMessage(result.message || "Your email has been verified successfully!");

        // Refresh JWT tokens so middleware gets updated email_verified claim
        try {
          await apiClient.post("/auth/refresh", {});
        } catch {
          // Token refresh failed — user can still continue via login
        }
      } catch (err) {
        setStatus("error");
        if (err instanceof ApiError) {
          setMessage(err.message);
        } else {
          setMessage("Verification failed. The link may have expired or is invalid.");
        }
      }
    }

    verify();
  }, [token]);

  // Auto-redirect countdown after success
  useEffect(() => {
    if (status !== "success") return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.refresh();
          router.push("/onboarding");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, router]);

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
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex justify-center">
              <Logo />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Email Verification</h1>
          </div>

          <div className="flex flex-col items-center gap-4 py-6 text-center">
            {status === "loading" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-3"
              >
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                <p className="text-sm font-medium text-slate-500">Verifying your email...</p>
              </motion.div>
            )}

            {status === "success" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Verified!</h2>
                <p className="text-sm font-medium text-slate-500">{message}</p>
                <p className="text-xs text-slate-400">
                  Redirecting to onboarding in {countdown}s...
                </p>
                <button
                  onClick={() => {
                    router.refresh();
                    router.push("/onboarding");
                  }}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-600"
                >
                  Continue Now <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Verification Failed</h2>
                <p className="text-sm font-medium text-slate-500">{message}</p>
                <Link
                  href="/login"
                  className="mt-4 flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-600"
                >
                  Go to Login <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function VerifyEmailFallback() {
  return (
    <div className="relative min-h-screen bg-slate-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <div className="w-full rounded-[2rem] border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/40">
          <div className="flex flex-col items-center gap-4 py-10">
            <div className="h-12 w-12 animate-pulse rounded-full bg-slate-200" />
            <div className="h-4 w-48 rounded bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
