"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  Check,
  Loader2,
  FileText,
  Globe,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Users,
  Upload,
  X,
  Plus,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { generatePptPresignedUrl } from "@/lib/organizer-client-api";

/* ─── Constants ──────────────────────────────────────────────────────── */

const EVENT_CATEGORIES = [
  { value: "TECHNOLOGY", label: "Technology" },
  { value: "MUSIC_ENTERTAINMENT", label: "Music & Entertainment" },
  { value: "BUSINESS", label: "Business" },
  { value: "EDUCATION", label: "Education" },
  { value: "SPORTS", label: "Sports" },
  { value: "CULTURAL", label: "Cultural" },
  { value: "ART_CREATIVE", label: "Art & Creative" },
  { value: "LIFESTYLE", label: "Lifestyle" },
  { value: "OTHER", label: "Other" },
] as const;

const AGE_BRACKETS = [
  { value: "AGE_5_12", label: "5–12 yrs" },
  { value: "AGE_12_17", label: "12–17 yrs" },
  { value: "AGE_17_28", label: "17–28 yrs" },
  { value: "AGE_28_45", label: "28–45 yrs" },
  { value: "AGE_45_PLUS", label: "45+ yrs" },
] as const;

const GENDER_TYPES = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
] as const;

const INCOME_BRACKETS = [
  { value: "BELOW_2L", label: "Below ₹2L" },
  { value: "BETWEEN_2L_5L", label: "₹2L – ₹5L" },
  { value: "BETWEEN_5L_10L", label: "₹5L – ₹10L" },
  { value: "BETWEEN_10L_25L", label: "₹10L – ₹25L" },
  { value: "ABOVE_25L", label: "Above ₹25L" },
] as const;

const PREDEFINED_TIERS = [
  {
    value: "TITLE",
    label: "Title Sponsor",
    price: 1000000,
    slots: 1,
    description: "Top-level branding and visibility",
    benefits: "Main stage branding, VIP access, Keynote mention, Logo on all materials",
  },
  {
    value: "PLATINUM",
    label: "Platinum Sponsor",
    price: 750000,
    slots: 1,
    description: "Premium platinum partnership",
    benefits: "Premium booth, Speaking slot, VIP access, Logo on banners",
  },
  {
    value: "PRESENTING",
    label: "Presenting Sponsor",
    price: 500000,
    slots: 1,
    description: "Primary event presentation rights",
    benefits: "Presentation opportunity, Booth prime location, Brand mentions",
  },
  {
    value: "POWERED_BY",
    label: "Powered By",
    price: 250000,
    slots: 1,
    description: "Secondary prominent placement",
    benefits: "Booth space, Social media shoutouts, Materials distribution",
  },
  {
    value: "GOLD",
    label: "Gold Tier",
    price: 100000,
    slots: 2,
    description: "Premium sponsorship package",
    benefits: "Standard booth, Networking access, Logo on website",
  },
  {
    value: "SILVER",
    label: "Silver Tier",
    price: 50000,
    slots: 3,
    description: "Standard sponsorship package",
    benefits: "Small booth, Event access, Name in sponsor list",
  },
] as const;

const STEP_LABELS = ["Basic Info", "Details & Location", "Audience Profile", "Sponsorship"];

/* ─── Types ──────────────────────────────────────────────────────────── */

interface Step1Data {
  title: string;
  description: string;
  category: string;
  website: string;
}

interface Step2Data {
  contactPhone: string;
  contactEmail: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  startDate: string;
  endDate: string;
  expectedFootfall: string;
}

interface GenderEntry { gender: string; percentage: string }
interface AgeEntry { bracket: string; percentage: string }
interface IncomeEntry { bracket: string; percentage: string }
interface RegionEntry { city: string; state: string; percentage: string }

interface Step3Data {
  genders: GenderEntry[];
  ages: AgeEntry[];
  incomes: IncomeEntry[];
  regions: RegionEntry[];
}

interface TierState {
  enabled: boolean;
  askingPrice: string;
  totalSlots: string;
  benefits: string;
}

interface CustomTier {
  customName: string;
  askingPrice: string;
  totalSlots: string;
  benefits: string;
}

/* ─── Shared styles (dark theme matching organizer dashboard) ────────── */

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const inputIconClass =
  "w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const selectClass =
  "w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-300";

/* ─── Progress Stepper ───────────────────────────────────────────────── */

function ProgressStepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6">
      {STEP_LABELS.map((label, idx) => {
        const step = idx + 1;
        return (
          <div key={step} className="flex items-center gap-2 sm:gap-4">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  step < currentStep
                    ? "bg-blue-600 text-white"
                    : step === currentStep
                    ? "bg-blue-600 text-white ring-4 ring-blue-500/20"
                    : "bg-slate-800 text-slate-500 border border-slate-700"
                }`}
              >
                {step < currentStep ? <Check className="w-4 h-4" /> : step}
              </div>
              <span className="text-[10px] font-medium text-slate-500 hidden sm:block">
                {label}
              </span>
            </div>
            {step < 4 && (
              <div
                className={`w-8 sm:w-14 h-0.5 rounded-full transition-all duration-300 ${
                  step < currentStep ? "bg-blue-600" : "bg-slate-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Step 1: Basic Info ─────────────────────────────────────────────── */

function Step1BasicInfo({
  data,
  setData,
  pptFile,
  pptPreview,
  pptUploading,
  onFileChange,
  onRemoveFile,
  onNext,
}: {
  data: Step1Data;
  setData: React.Dispatch<React.SetStateAction<Step1Data>>;
  pptFile: File | null;
  pptPreview: string | null;
  pptUploading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  onNext: () => void;
}) {
  const isValid = data.title.trim() !== "" && data.category !== "";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-sky-500 shadow-lg shadow-blue-500/20">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <h2 className="text-lg font-semibold text-white">Basic Information</h2>
      </div>

      <div className="space-y-4">
        {/* Event Title */}
        <div>
          <label className={labelClass}>
            Event Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => setData((p) => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Tech Innovation Summit 2026"
            maxLength={255}
            className={inputClass}
          />
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={data.description}
            onChange={(e) => setData((p) => ({ ...p, description: e.target.value }))}
            placeholder="Tell sponsors what your event is about, who attends, what makes it special…"
            rows={4}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Category */}
        <div>
          <label className={labelClass}>
            Category <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <select
              value={data.category}
              onChange={(e) => setData((p) => ({ ...p, category: e.target.value }))}
              className={selectClass}
            >
              <option value="">Select a category</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* PPT Deck Upload */}
        <div>
          <label className={labelClass}>PPT / PDF Deck (Optional)</label>
          <div className="rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/50 p-4">
            {pptPreview || pptFile ? (
              <div className="flex items-center justify-between rounded-lg bg-slate-700/50 p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-white">{pptFile?.name || "Uploaded file"}</p>
                    <p className="text-xs text-slate-400">
                      {pptFile ? `${Math.round(pptFile.size / 1024)} KB` : ""}
                      {pptUploading && " · Uploading…"}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={onRemoveFile} className="rounded-lg p-1 text-slate-400 hover:bg-slate-600 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center py-6">
                <Upload className="mb-2 h-10 w-10 text-slate-500" />
                <span className="text-sm text-slate-400">Click to upload PPT or PDF</span>
                <span className="mt-1 text-xs text-slate-500">Max 50 MB · .ppt, .pptx, .pdf</span>
                <input type="file" accept=".ppt,.pptx,.pdf" onChange={onFileChange} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Website */}
        <div>
          <label className={labelClass}>Website (Optional)</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="url"
              value={data.website}
              onChange={(e) => setData((p) => ({ ...p, website: e.target.value }))}
              placeholder="https://your-event.com"
              maxLength={500}
              className={inputIconClass}
            />
          </div>
        </div>
      </div>

      {/* Next */}
      <button
        onClick={onNext}
        disabled={!isValid}
        className={`mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${
          isValid
            ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
            : "bg-slate-800 text-slate-500 cursor-not-allowed"
        }`}
      >
        Continue <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─── Step 2: Details & Location ─────────────────────────────────────── */

function Step2DetailsLocation({
  data,
  setData,
  onNext,
  onBack,
}: {
  data: Step2Data;
  setData: React.Dispatch<React.SetStateAction<Step2Data>>;
  onNext: () => void;
  onBack: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const isValid =
    data.addressLine1.trim() !== "" &&
    data.city.trim() !== "" &&
    data.state.trim() !== "" &&
    data.country.trim() !== "" &&
    data.postalCode.trim() !== "" &&
    data.startDate !== "" &&
    data.endDate !== "" &&
    data.expectedFootfall !== "" &&
    Number(data.expectedFootfall) >= 0 &&
    data.startDate >= today &&
    data.endDate > data.startDate;

  return (
    <div className="space-y-6">
      {/* Contact Details */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/20">
            <Phone className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white">Organizer Contact Details</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Contact Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="tel"
                value={data.contactPhone}
                onChange={(e) => setData((p) => ({ ...p, contactPhone: e.target.value }))}
                placeholder="+91 98765 43210"
                maxLength={50}
                className={inputIconClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Contact Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={data.contactEmail}
                onChange={(e) => setData((p) => ({ ...p, contactEmail: e.target.value }))}
                placeholder="contact@yourevent.com"
                maxLength={255}
                className={inputIconClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/20">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white">Event Location</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Address Line 1 <span className="text-red-400">*</span></label>
            <input type="text" value={data.addressLine1} onChange={(e) => setData((p) => ({ ...p, addressLine1: e.target.value }))} placeholder="Street address" maxLength={255} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Address Line 2</label>
            <input type="text" value={data.addressLine2} onChange={(e) => setData((p) => ({ ...p, addressLine2: e.target.value }))} placeholder="Apartment, suite, etc." maxLength={255} className={inputClass} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>City <span className="text-red-400">*</span></label>
              <input type="text" value={data.city} onChange={(e) => setData((p) => ({ ...p, city: e.target.value }))} placeholder="City" maxLength={100} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>State / Province <span className="text-red-400">*</span></label>
              <input type="text" value={data.state} onChange={(e) => setData((p) => ({ ...p, state: e.target.value }))} placeholder="State" maxLength={100} className={inputClass} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Country <span className="text-red-400">*</span></label>
              <input type="text" value={data.country} onChange={(e) => setData((p) => ({ ...p, country: e.target.value }))} placeholder="Country" maxLength={100} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Postal Code <span className="text-red-400">*</span></label>
              <input type="text" value={data.postalCode} onChange={(e) => setData((p) => ({ ...p, postalCode: e.target.value }))} placeholder="Postal Code" maxLength={20} className={inputClass} />
            </div>
          </div>
        </div>
      </div>

      {/* Date & Footfall */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 shadow-lg shadow-purple-500/20">
            <Calendar className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white">Date & Attendance</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Start Date <span className="text-red-400">*</span></label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input type="date" value={data.startDate} min={today} onChange={(e) => setData((p) => ({ ...p, startDate: e.target.value }))} className={`${inputIconClass} [color-scheme:dark]`} />
            </div>
            {data.startDate && data.startDate < today && (
              <p className="mt-1 text-xs font-medium text-red-400">Must be a future date</p>
            )}
          </div>
          <div>
            <label className={labelClass}>End Date <span className="text-red-400">*</span></label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input type="date" value={data.endDate} min={data.startDate || today} onChange={(e) => setData((p) => ({ ...p, endDate: e.target.value }))} className={`${inputIconClass} [color-scheme:dark]`} />
            </div>
            {data.endDate && data.startDate && data.endDate <= data.startDate && (
              <p className="mt-1 text-xs font-medium text-red-400">Must be after start date</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Expected Footfall <span className="text-red-400">*</span></label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input type="number" value={data.expectedFootfall} onChange={(e) => setData((p) => ({ ...p, expectedFootfall: e.target.value }))} placeholder="e.g. 5000" min={0} className={inputIconClass} />
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex gap-3">
        <button onClick={onBack} className="rounded-xl border border-slate-700 px-6 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white">
          <ChevronLeft className="inline h-4 w-4 mr-1" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${
            isValid
              ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          Continue <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Step 3: Audience Profile ───────────────────────────────────────── */

function Step3AudienceProfile({
  data,
  setData,
  onNext,
  onBack,
}: {
  data: Step3Data;
  setData: React.Dispatch<React.SetStateAction<Step3Data>>;
  onNext: () => void;
  onBack: () => void;
}) {
  const sumPercent = (arr: { percentage: string }[]) =>
    arr.reduce((s, x) => s + (Number(x.percentage) || 0), 0);

  const genderTotal = sumPercent(data.genders);
  const ageTotal = sumPercent(data.ages);
  const incomeTotal = sumPercent(data.incomes);
  const regionTotal = sumPercent(data.regions);

  const genderValid = genderTotal <= 100;
  const ageValid = ageTotal <= 100;
  const incomeValid = incomeTotal <= 100;
  const regionValid = regionTotal <= 100;

  const isValid = genderValid && ageValid && incomeValid && regionValid;

  function updateGender(index: number, value: string) {
    setData((p) => {
      const g = [...p.genders];
      g[index] = { ...g[index], percentage: value };
      return { ...p, genders: g };
    });
  }
  function updateAge(index: number, value: string) {
    setData((p) => {
      const a = [...p.ages];
      a[index] = { ...a[index], percentage: value };
      return { ...p, ages: a };
    });
  }
  function updateIncome(index: number, value: string) {
    setData((p) => {
      const inc = [...p.incomes];
      inc[index] = { ...inc[index], percentage: value };
      return { ...p, incomes: inc };
    });
  }
  function updateRegion(index: number, field: keyof RegionEntry, value: string) {
    setData((p) => {
      const r = [...p.regions];
      r[index] = { ...r[index], [field]: value };
      return { ...p, regions: r };
    });
  }
  function addRegion() {
    setData((p) => ({
      ...p,
      regions: [...p.regions, { city: "", state: "", percentage: "" }],
    }));
  }
  function removeRegion(index: number) {
    setData((p) => ({
      ...p,
      regions: p.regions.filter((_, i) => i !== index),
    }));
  }

  const barBg = (total: number) =>
    total > 100 ? "bg-red-500" : total === 100 ? "bg-emerald-500" : "bg-blue-500";
  const percentInputClass =
    "w-20 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="space-y-6">
      {/* Age Bracket */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/20">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white">Age Bracket</h2>
        </div>
        <div className="space-y-3">
          {data.ages.map((entry, i) => (
            <div key={entry.bracket} className="flex items-center gap-4">
              <span className="w-24 text-sm font-medium text-slate-400">
                {AGE_BRACKETS.find((a) => a.value === entry.bracket)?.label}
              </span>
              <input type="number" min={0} max={100} value={entry.percentage} onChange={(e) => updateAge(i, e.target.value)} placeholder="0" className={percentInputClass} />
              <span className="text-xs text-slate-500">%</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barBg(ageTotal)}`} style={{ width: `${Math.min(ageTotal, 100)}%` }} />
          </div>
          <span className={`text-xs font-bold ${ageTotal > 100 ? "text-red-400" : "text-slate-500"}`}>{ageTotal}%</span>
        </div>
        {ageTotal > 100 && <p className="mt-1 text-xs font-medium text-red-400">Total cannot exceed 100%</p>}
      </div>

      {/* Gender */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg shadow-pink-500/20">
            <Users className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white">Audience Gender</h2>
        </div>
        <div className="space-y-3">
          {data.genders.map((entry, i) => (
            <div key={entry.gender} className="flex items-center gap-4">
              <span className="w-24 text-sm font-medium text-slate-400">
                {GENDER_TYPES.find((g) => g.value === entry.gender)?.label}
              </span>
              <input type="number" min={0} max={100} value={entry.percentage} onChange={(e) => updateGender(i, e.target.value)} placeholder="0" className={percentInputClass} />
              <span className="text-xs text-slate-500">%</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barBg(genderTotal)}`} style={{ width: `${Math.min(genderTotal, 100)}%` }} />
          </div>
          <span className={`text-xs font-bold ${genderTotal > 100 ? "text-red-400" : "text-slate-500"}`}>{genderTotal}%</span>
        </div>
        {genderTotal > 100 && <p className="mt-1 text-xs font-medium text-red-400">Total cannot exceed 100%</p>}
      </div>

      {/* Income */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/20">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white">Income Bracket</h2>
        </div>
        <div className="space-y-3">
          {data.incomes.map((entry, i) => (
            <div key={entry.bracket} className="flex items-center gap-4">
              <span className="w-24 text-sm font-medium text-slate-400">
                {INCOME_BRACKETS.find((inc) => inc.value === entry.bracket)?.label}
              </span>
              <input type="number" min={0} max={100} value={entry.percentage} onChange={(e) => updateIncome(i, e.target.value)} placeholder="0" className={percentInputClass} />
              <span className="text-xs text-slate-500">%</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barBg(incomeTotal)}`} style={{ width: `${Math.min(incomeTotal, 100)}%` }} />
          </div>
          <span className={`text-xs font-bold ${incomeTotal > 100 ? "text-red-400" : "text-slate-500"}`}>{incomeTotal}%</span>
        </div>
        {incomeTotal > 100 && <p className="mt-1 text-xs font-medium text-red-400">Total cannot exceed 100%</p>}
      </div>

      {/* Region */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-500 shadow-lg shadow-sky-500/20">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white">Region Distribution</h2>
        </div>
        {data.regions.length === 0 && (
          <p className="text-sm text-slate-500 mb-3">No regions added yet.</p>
        )}
        <div className="space-y-3">
          {data.regions.map((entry, i) => (
            <div key={i} className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <input type="text" value={entry.city} onChange={(e) => updateRegion(i, "city", e.target.value)} placeholder="City" className={`flex-1 min-w-[80px] ${inputClass}`} />
              <input type="text" value={entry.state} onChange={(e) => updateRegion(i, "state", e.target.value)} placeholder="State" className={`flex-1 min-w-[80px] ${inputClass}`} />
              <input type="number" min={0} max={100} value={entry.percentage} onChange={(e) => updateRegion(i, "percentage", e.target.value)} placeholder="%" className={percentInputClass} />
              <button type="button" onClick={() => removeRegion(i)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-700 hover:text-red-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRegion}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-600 px-4 py-2 text-sm text-slate-400 hover:border-slate-500 hover:text-white"
        >
          <Plus className="w-4 h-4" /> Add Region
        </button>
        {data.regions.length > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barBg(regionTotal)}`} style={{ width: `${Math.min(regionTotal, 100)}%` }} />
            </div>
            <span className={`text-xs font-bold ${regionTotal > 100 ? "text-red-400" : "text-slate-500"}`}>{regionTotal}%</span>
          </div>
        )}
        {regionTotal > 100 && <p className="mt-1 text-xs font-medium text-red-400">Total cannot exceed 100%</p>}
      </div>

      {/* Nav */}
      <div className="flex gap-3">
        <button onClick={onBack} className="rounded-xl border border-slate-700 px-6 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white">
          <ChevronLeft className="inline h-4 w-4 mr-1" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${
            isValid
              ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          Continue <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Step 4: Sponsorship Availability ───────────────────────────────── */

function Step4Sponsorship({
  predefinedStates,
  setPredefinedStates,
  customTiers,
  setCustomTiers,
  onBack,
  onSubmit,
  isSubmitting,
  submitError,
}: {
  predefinedStates: Record<string, TierState>;
  setPredefinedStates: React.Dispatch<React.SetStateAction<Record<string, TierState>>>;
  customTiers: CustomTier[];
  setCustomTiers: React.Dispatch<React.SetStateAction<CustomTier[]>>;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitError: string;
}) {
  const hasAtLeastOneTier =
    Object.values(predefinedStates).some((t) => t.enabled) ||
    customTiers.some((t) => t.customName.trim() !== "");

  function updateTier(val: string, field: keyof TierState, value: string | boolean) {
    setPredefinedStates((prev) => ({
      ...prev,
      [val]: { ...prev[val], [field]: value },
    }));
  }

  function addCustom() {
    setCustomTiers((prev) => [...prev, { customName: "", askingPrice: "", totalSlots: "1", benefits: "" }]);
  }
  function removeCustom(i: number) {
    setCustomTiers((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateCustom(i: number, field: keyof CustomTier, value: string) {
    setCustomTiers((prev) => {
      const c = [...prev];
      c[i] = { ...c[i], [field]: value };
      return c;
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white">Sponsorship Availability</h2>
        </div>

        <p className="mb-4 text-sm text-slate-400">
          Select the sponsorship tiers you want to offer for this event. Check the tiers you want to include and set the price and available slots.
        </p>

        {/* Predefined tiers */}
        <div className="space-y-3">
          {PREDEFINED_TIERS.map((tier) => {
            const st = predefinedStates[tier.value];
            const isEnabled = st?.enabled ?? false;
            return (
              <div key={tier.value} className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
                <div className="flex items-start gap-4 p-4">
                  <div className="flex items-center pt-1">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => updateTier(tier.value, "enabled", e.target.checked)}
                      className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-base font-medium text-white">{tier.label}</span>
                    <span className="ml-2 text-xs text-slate-500">– {tier.description}</span>
                    <p className="mt-1 text-xs text-blue-400">{tier.benefits}</p>
                  </div>
                </div>
                {isEnabled && (
                  <div className="border-t border-slate-700 bg-slate-800/30 p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-400">Asking Price (₹)</label>
                        <input type="number" min={0} value={st.askingPrice} onChange={(e) => updateTier(tier.value, "askingPrice", e.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-400">Total Slots</label>
                        <input type="number" min={1} max={100} value={st.totalSlots} onChange={(e) => updateTier(tier.value, "totalSlots", e.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="mb-1 block text-xs font-medium text-slate-400">Benefits (comma separated)</label>
                      <input type="text" value={st.benefits} onChange={(e) => updateTier(tier.value, "benefits", e.target.value)} placeholder="e.g. Booth, Logo, Social mentions" className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom tiers */}
        <div className="mt-6">
          <button
            type="button"
            onClick={addCustom}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-600 px-4 py-2 text-sm text-slate-400 hover:border-slate-500 hover:text-white"
          >
            <Plus className="h-4 w-4" /> Add Custom Sponsorship Tier
          </button>

          {customTiers.map((ct, i) => (
            <div key={i} className="mt-4 rounded-xl border border-slate-600 bg-slate-800/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-300">Custom Tier Name <span className="text-red-400">*</span></label>
                    <input type="text" value={ct.customName} onChange={(e) => updateCustom(i, "customName", e.target.value)} placeholder="e.g. Bronze, Media Partner, etc." className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Asking Price (₹)</label>
                      <input type="number" min={0} value={ct.askingPrice} onChange={(e) => updateCustom(i, "askingPrice", e.target.value)} placeholder="0" className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Total Slots</label>
                      <input type="number" min={1} max={100} value={ct.totalSlots} onChange={(e) => updateCustom(i, "totalSlots", e.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">Benefits (comma separated)</label>
                    <input type="text" value={ct.benefits} onChange={(e) => updateCustom(i, "benefits", e.target.value)} placeholder="e.g. Booth, Logo" className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
                <button type="button" onClick={() => removeCustom(i)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {submitError && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
          <X className="h-5 w-5 flex-shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{submitError}</p>
        </div>
      )}

      {/* Nav */}
      <div className="flex gap-3">
        <button onClick={onBack} disabled={isSubmitting} className="rounded-xl border border-slate-700 px-6 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:opacity-50">
          <ChevronLeft className="inline h-4 w-4 mr-1" /> Back
        </button>
        <button
          onClick={onSubmit}
          disabled={!hasAtLeastOneTier || isSubmitting}
          className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-8 py-2.5 text-sm font-semibold transition-all ${
            hasAtLeastOneTier && !isSubmitting
              ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Create Event
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── Step 5: Success ────────────────────────────────────────────────── */

function StepSuccess() {
  const router = useRouter();
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">
        Event Created Successfully!
      </h2>
      <p className="mx-auto mb-8 max-w-sm text-sm text-slate-400 leading-relaxed">
        Your event has been submitted for manager review. Once approved, it will be visible to sponsors.
      </p>
      <button
        onClick={() => {
          router.push("/organizer/events");
          router.refresh();
        }}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
      >
        Back to Dashboard <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Main Form Component
   ═══════════════════════════════════════════════════════════════════════ */

export default function NewEventMultiStepForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  /* ── Step 1 ── */
  const [step1, setStep1] = useState<Step1Data>({
    title: "",
    description: "",
    category: "",
    website: "",
  });

  /* ── PPT Upload ── */
  const [pptFile, setPptFile] = useState<File | null>(null);
  const [pptPreview, setPptPreview] = useState<string | null>(null);
  const [pptUploading, setPptUploading] = useState(false);
  const [pptUploadedUrl, setPptUploadedUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const valid = [
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/pdf",
    ];
    if (!valid.includes(file.type)) {
      setFileError("Please upload a valid PowerPoint or PDF file");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setFileError("File size must be less than 50 MB");
      return;
    }
    setPptFile(file);
    setPptPreview(URL.createObjectURL(file));
    setPptUploadedUrl(null);
    setFileError(null);
  }

  function removeFile() {
    if (pptPreview && !pptPreview.startsWith("http")) URL.revokeObjectURL(pptPreview);
    setPptFile(null);
    setPptPreview(null);
    setPptUploadedUrl(null);
  }

  async function uploadPptToS3(file: File): Promise<string | null> {
    try {
      setPptUploading(true);
      const presigned = await generatePptPresignedUrl(file.name, file.type);
      const res = await fetch(presigned.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      setPptUploadedUrl(presigned.fileUrl);
      return presigned.fileUrl;
    } catch (err: any) {
      setFileError(err.message || "Failed to upload PPT deck.");
      return null;
    } finally {
      setPptUploading(false);
    }
  }

  /* ── Step 2 ── */
  const [step2, setStep2] = useState<Step2Data>({
    contactPhone: "",
    contactEmail: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    startDate: "",
    endDate: "",
    expectedFootfall: "",
  });

  /* ── Step 3 ── */
  const [step3, setStep3] = useState<Step3Data>({
    genders: GENDER_TYPES.map((g) => ({ gender: g.value, percentage: "" })),
    ages: AGE_BRACKETS.map((a) => ({ bracket: a.value, percentage: "" })),
    incomes: INCOME_BRACKETS.map((inc) => ({ bracket: inc.value, percentage: "" })),
    regions: [],
  });

  /* ── Step 4 ── */
  const [predefinedStates, setPredefinedStates] = useState<Record<string, TierState>>(() => {
    const init: Record<string, TierState> = {};
    PREDEFINED_TIERS.forEach((t) => {
      init[t.value] = {
        enabled: false,
        askingPrice: t.price.toString(),
        totalSlots: t.slots.toString(),
        benefits: t.benefits,
      };
    });
    return init;
  });
  const [customTiers, setCustomTiers] = useState<CustomTier[]>([]);

  /* ── Submission ── */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      // Upload PPT first if pending
      let pptUrl = pptUploadedUrl;
      if (pptFile && !pptUrl) {
        pptUrl = await uploadPptToS3(pptFile);
        if (!pptUrl) {
          setIsSubmitting(false);
          return;
        }
      }

      // Build tiers array
      const tiers: any[] = [];
      PREDEFINED_TIERS.forEach((pt) => {
        const st = predefinedStates[pt.value];
        if (st?.enabled) {
          tiers.push({
            tierType: pt.value,
            askingPrice: Number(st.askingPrice) || 0,
            totalSlots: Number(st.totalSlots) || 1,
            benefits: st.benefits.split(",").map((b) => b.trim()).filter(Boolean),
          });
        }
      });
      customTiers.forEach((ct) => {
        if (ct.customName.trim()) {
          tiers.push({
            tierType: "CUSTOM",
            customName: ct.customName.trim(),
            askingPrice: Number(ct.askingPrice) || 0,
            totalSlots: Number(ct.totalSlots) || 1,
            benefits: ct.benefits.split(",").map((b) => b.trim()).filter(Boolean),
          });
        }
      });

      if (tiers.length === 0) {
        setSubmitError("Please select at least one sponsorship tier.");
        setIsSubmitting(false);
        return;
      }

      // Build audience profile (only include non-empty entries)
      const genders = step3.genders
        .filter((g) => g.percentage !== "" && Number(g.percentage) > 0)
        .map((g) => ({ gender: g.gender, percentage: Number(g.percentage) }));
      const ages = step3.ages
        .filter((a) => a.percentage !== "" && Number(a.percentage) > 0)
        .map((a) => ({ bracket: a.bracket, percentage: Number(a.percentage) }));
      const incomes = step3.incomes
        .filter((inc) => inc.percentage !== "" && Number(inc.percentage) > 0)
        .map((inc) => ({ bracket: inc.bracket, percentage: Number(inc.percentage) }));
      const regions = step3.regions
        .filter((r) => r.city.trim() && r.state.trim() && r.percentage !== "" && Number(r.percentage) > 0)
        .map((r) => ({ city: r.city.trim(), state: r.state.trim(), percentage: Number(r.percentage) }));

      const audienceProfile =
        genders.length || ages.length || incomes.length || regions.length
          ? {
              ...(genders.length && { genders }),
              ...(ages.length && { ages }),
              ...(incomes.length && { incomes }),
              ...(regions.length && { regions }),
            }
          : undefined;

      const payload: any = {
        title: step1.title.trim(),
        description: step1.description.trim() || undefined,
        category: step1.category,
        website: step1.website.trim() || undefined,
        pptDeckUrl: pptUrl || undefined,
        contactPhone: step2.contactPhone.trim() || undefined,
        contactEmail: step2.contactEmail.trim() || undefined,
        address: {
          addressLine1: step2.addressLine1.trim(),
          addressLine2: step2.addressLine2.trim() || undefined,
          city: step2.city.trim(),
          state: step2.state.trim(),
          country: step2.country.trim(),
          postalCode: step2.postalCode.trim(),
        },
        startDate: new Date(step2.startDate).toISOString(),
        endDate: new Date(step2.endDate).toISOString(),
        expectedFootfall: Number(step2.expectedFootfall),
        audienceProfile,
        tiers,
      };

      await apiClient.post("/organizer/events", payload);
      setCurrentStep(5); // success
    } catch (err: any) {
      const msg = err?.detail || err?.message || "Failed to create event. Please try again.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-400 transition-all hover:border-slate-600 hover:bg-slate-700 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Create New Event</h1>
          <p className="mt-1 text-sm text-slate-400">
            Fill in the details below to create your event. It will be reviewed by a manager before being published.
          </p>
        </div>
      </div>

      {/* Stepper */}
      {currentStep <= 4 && <ProgressStepper currentStep={currentStep} />}

      {/* File error banner */}
      {fileError && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
          <X className="h-5 w-5 flex-shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{fileError}</p>
        </div>
      )}

      {/* Steps */}
      {currentStep === 1 && (
        <Step1BasicInfo
          data={step1}
          setData={setStep1}
          pptFile={pptFile}
          pptPreview={pptPreview}
          pptUploading={pptUploading}
          onFileChange={handleFileChange}
          onRemoveFile={removeFile}
          onNext={() => setCurrentStep(2)}
        />
      )}
      {currentStep === 2 && (
        <Step2DetailsLocation
          data={step2}
          setData={setStep2}
          onNext={() => setCurrentStep(3)}
          onBack={() => setCurrentStep(1)}
        />
      )}
      {currentStep === 3 && (
        <Step3AudienceProfile
          data={step3}
          setData={setStep3}
          onNext={() => setCurrentStep(4)}
          onBack={() => setCurrentStep(2)}
        />
      )}
      {currentStep === 4 && (
        <Step4Sponsorship
          predefinedStates={predefinedStates}
          setPredefinedStates={setPredefinedStates}
          customTiers={customTiers}
          setCustomTiers={setCustomTiers}
          onBack={() => setCurrentStep(3)}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitError={submitError}
        />
      )}
      {currentStep === 5 && <StepSuccess />}
    </div>
  );
}
