"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api-client";
import { motion } from "framer-motion";
import { Mail, RefreshCw, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import Logo from "@/components/logo/logo";

interface VerificationStatus {
  emailVerified: boolean;
  maskedEmail: string;
  canResend: boolean;
  cooldownSeconds: number;
  attemptsRemaining: number;
}

export default function VerifyEmailPendingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch verification status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiClient.get<VerificationStatus>("/auth/verification-status");
      setStatus(res);

      if (res.emailVerified) {
        // Email verified! Refresh tokens to get updated JWT, then redirect
        try {
          await apiClient.post("/auth/refresh", {});
        } catch {
          // refresh may fail if token rotation happened — still redirect
        }
        router.refresh();
        router.push("/onboarding");
        return;
      }

      // Update cooldown from server if higher than local
      if (res.cooldownSeconds > cooldown) {
        setCooldown(res.cooldownSeconds);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
      }
    }
  }, [router, cooldown]);

  // Poll for verification status every 5 seconds
  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      return;
    }

    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [cooldown]);

  // Resend verification email
  const handleResend = async () => {
    setResending(true);
    setError(null);
    setResendMessage(null);

    try {
      const res = await apiClient.post<{
        message: string;
        attemptsRemaining: number;
        cooldownSeconds: number;
      }>("/auth/resend-verification", {});

      setResendMessage(res.message);
      setCooldown(res.cooldownSeconds);

      // Update local status
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              attemptsRemaining: res.attemptsRemaining,
              canResend: false,
              cooldownSeconds: res.cooldownSeconds,
            }
          : prev,
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to resend verification email. Please try again.");
      }
    } finally {
      setResending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const canResendNow = status && !status.emailVerified && cooldown === 0 && (status.attemptsRemaining ?? 0) > 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-10 sm:px-6 sm:py-14">
      {/* Background decorations */}
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
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex justify-center">
              <Logo />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Verify Your Email
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              We&apos;ve sent a verification link to your email
            </p>
          </div>

          {/* Email Icon + Animation */}
          <div className="flex flex-col items-center gap-4 py-4">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100"
            >
              <Mail className="h-10 w-10 text-indigo-600" />
            </motion.div>

            {/* Masked email */}
            {status?.maskedEmail && (
              <p className="text-sm font-semibold text-slate-700">
                {status.maskedEmail}
              </p>
            )}

            <p className="max-w-xs text-center text-sm text-slate-500">
              Click the verification link in your email to continue.
              Check your <span className="font-semibold">spam/junk</span> folder if you don&apos;t see it.
            </p>
          </div>

          {/* Resend section */}
          <div className="mt-6 flex flex-col items-center gap-3">
            {/* Cooldown timer */}
            {cooldown > 0 && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock className="h-4 w-4" />
                <span>Resend available in <span className="font-bold text-indigo-600">{formatTime(cooldown)}</span></span>
              </div>
            )}

            {/* Attempts remaining */}
            {status && !status.emailVerified && (
              <p className="text-xs text-slate-400">
                {status.attemptsRemaining > 0
                  ? `${status.attemptsRemaining} resend${status.attemptsRemaining !== 1 ? "s" : ""} remaining today`
                  : "No more resends available today"}
              </p>
            )}

            {/* Resend button */}
            <button
              onClick={handleResend}
              disabled={!canResendNow || resending}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
              {resending ? "Sending..." : "Resend Verification Email"}
            </button>

            {/* Success message */}
            {resendMessage && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm font-medium text-green-600"
              >
                <CheckCircle2 className="h-4 w-4" />
                {resendMessage}
              </motion.div>
            )}

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm font-medium text-red-600"
              >
                <AlertTriangle className="h-4 w-4" />
                {error}
              </motion.div>
            )}

            {/* Max attempts reached warning */}
            {status && status.attemptsRemaining === 0 && !status.emailVerified && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center"
              >
                <div className="flex items-center justify-center gap-2 text-sm font-bold text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  Maximum resends reached
                </div>
                <p className="mt-1 text-xs text-amber-600">
                  You can try again tomorrow. If you&apos;re having trouble, contact support.
                </p>
              </motion.div>
            )}
          </div>

          {/* Polling indicator */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            Waiting for verification...
          </div>
        </motion.div>
      </div>
    </div>
  );
}
