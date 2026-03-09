"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Globe,
  Mail,
  Calendar,
  Shield,
  ShieldCheck,
  ShieldX,
  CheckCircle2,
  XCircle,
  Loader2,
  Target,
  Briefcase,
  Clock,
  AlertTriangle,
  User,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface CompanyDetail {
  id: string;
  name: string;
  slug?: string | null;
  type: string;
  website?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  verificationStatus: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: { id: string; email: string } | null;
  owner?: { id: string; email: string; name?: string };
}

/* ─── Industry label mapping ─────────────────────────────────────────── */

const INDUSTRY_LABELS: Record<string, string> = {
  TECHNOLOGY: "Technology",
  FINANCE: "Finance",
  FMCG: "FMCG",
  HEALTHCARE_PHARMA: "Healthcare & Pharma",
  RETAIL_ECOMMERCE: "Retail & E-Commerce",
  MANUFACTURING_INDUSTRIAL: "Manufacturing & Industrial",
  MEDIA_ENTERTAINMENT: "Media & Entertainment",
  EDUCATION: "Education",
  ENERGY_UTILITIES: "Energy & Utilities",
  REAL_ESTATE_CONSTRUCTION: "Real Estate & Construction",
  LOGISTICS_TRANSPORTATION: "Logistics & Transportation",
  TELECOM: "Telecom",
  OTHER: "Other",
};

/* ─── Main Component ─────────────────────────────────────────────────── */

interface CompanyVerificationDetailProps {
  id: string;
}

export default function CompanyVerificationDetail({
  id,
}: CompanyVerificationDetailProps) {
  const router = useRouter();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verification state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [rejectionError, setRejectionError] = useState("");
  const [actionLoading, setActionLoading] = useState<
    "verify" | "reject" | null
  >(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchCompany = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<CompanyDetail>(
        `/manager/companies/${id}`
      );
      setCompany(data);
    } catch (err: any) {
      setError(
        err?.message || err?.detail || "Failed to load company details."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  async function handleVerify() {
    if (!company) return;
    setActionLoading("verify");
    setActionSuccess(null);
    try {
      await apiClient.post(`/manager/companies/${company.id}/verify`, {
        action: "verify",
      });
      setActionSuccess("Company has been verified successfully!");
      // Refresh company data
      await fetchCompany();
    } catch (err: any) {
      setError(err?.message || err?.detail || "Failed to verify company.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject() {
    if (!company) return;
    if (!rejectionNotes.trim() || rejectionNotes.trim().length < 5) {
      setRejectionError(
        "Please provide a reason for rejection (at least 5 characters)."
      );
      return;
    }
    setRejectionError("");
    setActionLoading("reject");
    setActionSuccess(null);
    try {
      await apiClient.post(`/manager/companies/${company.id}/verify`, {
        action: "reject",
        notes: rejectionNotes.trim(),
      });
      setActionSuccess("Company has been rejected.");
      setShowRejectModal(false);
      setRejectionNotes("");
      // Refresh company data
      await fetchCompany();
    } catch (err: any) {
      setRejectionError(
        err?.message || err?.detail || "Failed to reject company."
      );
    } finally {
      setActionLoading(null);
    }
  }

  // Format date helper
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /* ─── Loading ──────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-sm text-slate-400">Loading company details…</p>
        </div>
      </div>
    );
  }

  /* ─── Error ────────────────────────────────────────────── */

  if (error && !company) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <XCircle className="mx-auto mb-3 h-8 w-8 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={() => router.push("/manager/verifyBrands")}
            className="mt-4 rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white"
          >
            ← Back to companies
          </button>
        </div>
      </div>
    );
  }

  if (!company) return null;

  /* ─── Status badge ─────────────────────────────────────── */

  const statusConfig: Record<
    string,
    { label: string; icon: React.ReactNode; cls: string }
  > = {
    PENDING: {
      label: "Pending Review",
      icon: <Clock className="h-3.5 w-3.5" />,
      cls: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    },
    VERIFIED: {
      label: "Verified",
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    },
    REJECTED: {
      label: "Rejected",
      icon: <ShieldX className="h-3.5 w-3.5" />,
      cls: "border-red-500/30 bg-red-500/10 text-red-400",
    },
  };

  const status =
    statusConfig[company.verificationStatus] ?? statusConfig.PENDING;
  const isPending = company.verificationStatus === "PENDING";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ── Back + Header ── */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push("/manager/verifyBrands")}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-400 transition-all hover:border-slate-600 hover:bg-slate-700 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{company.name}</h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${status.cls}`}
            >
              {status.icon}
              {status.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Brand verification details
          </p>
        </div>
      </div>

      {/* ── Success Banner ── */}
      {actionSuccess && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
          <p className="text-sm text-emerald-300">{actionSuccess}</p>
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && company && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
          <XCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* ── Company Info Card ── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 shadow-lg shadow-purple-500/20">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white">
            Company Information
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Company Name */}
          <div className="space-y-1">
            <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              <Building2 className="h-3.5 w-3.5" />
              Company Name
            </dt>
            <dd className="text-sm font-medium text-white">{company.name}</dd>
          </div>

          {/* Industry */}
          <div className="space-y-1">
            <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              <Briefcase className="h-3.5 w-3.5" />
              Industry
            </dt>
            <dd className="text-sm font-medium text-white">
              {INDUSTRY_LABELS[company.type] || company.type || "—"}
            </dd>
          </div>

          {/* Website */}
          <div className="space-y-1">
            <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              <Globe className="h-3.5 w-3.5" />
              Website
            </dt>
            <dd className="text-sm text-white">
              {company.website ? (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  {company.website}
                </a>
              ) : (
                <span className="text-slate-500">Not provided</span>
              )}
            </dd>
          </div>

          {/* Owner Email */}
          <div className="space-y-1">
            <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              <Mail className="h-3.5 w-3.5" />
              Owner Email
            </dt>
            <dd className="text-sm text-white">
              {company.owner?.email || (
                <span className="text-slate-500">Not available</span>
              )}
            </dd>
          </div>

          {/* Registered On */}
          <div className="space-y-1">
            <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              Registered On
            </dt>
            <dd className="text-sm text-white">
              {formatDate(company.createdAt)}
            </dd>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              <Shield className="h-3.5 w-3.5" />
              Status
            </dt>
            <dd>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.cls}`}
              >
                {status.icon}
                {status.label}
              </span>
            </dd>
          </div>
        </div>
      </div>

      {/* ── Strategic Intent Card ── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-sky-500 shadow-lg shadow-blue-500/20">
            <Target className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white">Strategic Intent</h2>
        </div>
        <p className="text-sm leading-relaxed text-slate-300">
          {company.description || (
            <span className="text-slate-500 italic">
              No strategic intent provided by the brand.
            </span>
          )}
        </p>
      </div>

      {/* ── Verification Info (if verified or rejected) ── */}
      {(company.verificationStatus === "VERIFIED" ||
        company.verificationStatus === "REJECTED") && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-lg ${
                company.verificationStatus === "VERIFIED"
                  ? "bg-gradient-to-br from-emerald-500 to-green-500 shadow-emerald-500/20"
                  : "bg-gradient-to-br from-red-500 to-rose-500 shadow-red-500/20"
              }`}
            >
              {company.verificationStatus === "VERIFIED" ? (
                <ShieldCheck className="h-4 w-4 text-white" />
              ) : (
                <ShieldX className="h-4 w-4 text-white" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-white">
              Verification Details
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {company.verifiedAt && (
              <div className="space-y-1">
                <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  {company.verificationStatus === "VERIFIED"
                    ? "Verified At"
                    : "Rejected At"}
                </dt>
                <dd className="text-sm text-white">
                  {formatDateTime(company.verifiedAt)}
                </dd>
              </div>
            )}

            {company.verifiedBy && (
              <div className="space-y-1">
                <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                  <User className="h-3.5 w-3.5" />
                  {company.verificationStatus === "VERIFIED"
                    ? "Verified By"
                    : "Rejected By"}
                </dt>
                <dd className="text-sm text-white">
                  {company.verifiedBy.email}
                </dd>
              </div>
            )}
          </div>

          {/* Rejection reason */}
          {company.verificationStatus === "REJECTED" &&
            company.rejectionReason && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-red-400 mb-1">
                      Rejection Reason
                    </p>
                    <p className="text-sm leading-relaxed text-slate-300">
                      {company.rejectionReason}
                    </p>
                  </div>
                </div>
              </div>
            )}
        </div>
      )}

      {/* ── Action Buttons (only if PENDING) ── */}
      {isPending && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/20">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Verification Actions
            </h2>
          </div>
          <p className="mb-5 text-sm text-slate-400">
            Review the company details above and take an appropriate action.
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleVerify}
              disabled={actionLoading !== null}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                actionLoading !== null
                  ? "cursor-not-allowed bg-slate-800 text-slate-500"
                  : "bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5"
              }`}
            >
              {actionLoading === "verify" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Approve Company
                </>
              )}
            </button>

            <button
              onClick={() => setShowRejectModal(true)}
              disabled={actionLoading !== null}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold transition-all ${
                actionLoading !== null
                  ? "cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500"
                  : "border-red-500/30 bg-red-500/10 text-red-400 hover:border-red-500/50 hover:bg-red-500/20"
              }`}
            >
              <XCircle className="h-4 w-4" /> Reject Company
            </button>
          </div>
        </div>
      )}

      {/* ── Rejection Modal ── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                <ShieldX className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Reject Company
                </h3>
                <p className="text-xs text-slate-400">
                  Please provide a reason for rejection
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Rejection Notes <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={rejectionNotes}
                  onChange={(e) => {
                    setRejectionNotes(e.target.value);
                    if (rejectionError) setRejectionError("");
                  }}
                  placeholder="Explain why this company is being rejected…"
                  rows={4}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                />
                {rejectionError && (
                  <p className="mt-1 text-xs font-medium text-red-400">
                    {rejectionError}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionNotes("");
                    setRejectionError("");
                  }}
                  disabled={actionLoading !== null}
                  className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading !== null}
                  className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    actionLoading !== null
                      ? "cursor-not-allowed bg-slate-800 text-slate-500"
                      : "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20"
                  }`}
                >
                  {actionLoading === "reject" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Rejecting…
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" /> Confirm Rejection
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
