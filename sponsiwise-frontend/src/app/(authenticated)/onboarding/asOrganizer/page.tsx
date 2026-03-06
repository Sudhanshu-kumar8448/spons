"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Globe,
  FileText,
  ArrowRight,
  Check,
  ArrowLeft,
  Sparkles,
  Phone,
  Linkedin,
  Loader2,
  Users,
} from "lucide-react";
import Logo from "@/components/logo/logo";
import { apiClient } from "@/lib/api-client";

/**
 * Organizer type options matching backend OrganizerType enum
 */
const ORGANIZER_TYPE_OPTIONS = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "COMPANY", label: "Company" },
  { value: "NON_PROFIT", label: "Non-Profit" },
  { value: "GOVERNMENT", label: "Government" },
  { value: "EDUCATIONAL_INSTITUTION", label: "Educational Institution" },
  { value: "CLUB", label: "Club" },
  { value: "FRANCHISE", label: "Franchise" },
  { value: "SOCIETY", label: "Society" },
  { value: "LEAGUE", label: "League" },
  { value: "OTHER", label: "Other" },
] as const;

/**
 * Step 1: Organizer Identity Data
 */
interface Step1Data {
  entityName: string;
  organizerType: string;
  contactPhone: string;
  socialMedia: string;
}

/**
 * Step 2: Business Credentials Data
 */
interface Step2Data {
  website: string;
  gstTaxId: string;
  description: string;
}

/**
 * Progress Stepper Component Props
 */
interface ProgressStepperProps {
  currentStep: number;
}

/**
 * Progress Stepper Component
 */
function ProgressStepper({ currentStep }: ProgressStepperProps) {
  return (
    <div className="flex items-center justify-center gap-4 mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center gap-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-300 ${
              step < currentStep
                ? "bg-indigo-600 text-white"
                : step === currentStep
                ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                : "bg-slate-200 text-slate-400"
            }`}
          >
            {step < currentStep ? <Check className="w-5 h-5" /> : step}
          </div>
          {step < 3 && (
            <div
              className={`w-16 h-1 rounded-full transition-all duration-300 ${
                step < currentStep ? "bg-indigo-600" : "bg-slate-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Step 1: Organizer Identity Component Props
 */
interface Step1OrganizerIdentityProps {
  step1Data: Step1Data;
  setStep1Data: React.Dispatch<React.SetStateAction<Step1Data>>;
  onNext: () => void;
}

/**
 * Step 1: Organizer Identity Component
 */
function Step1OrganizerIdentity({
  step1Data,
  setStep1Data,
  onNext,
}: Step1OrganizerIdentityProps) {
  /**
   * Check if Step 1 is valid
   */
  const isStep1Valid = (): boolean => {
    return (
      step1Data.entityName.trim() !== "" &&
      step1Data.organizerType !== "" &&
      step1Data.contactPhone.trim() !== "" &&
      step1Data.socialMedia.trim() !== ""
    );
  };

  return (
    <div className="bg-white p-8 sm:p-12 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-xl shadow-indigo-50/50">
      <div className="mb-8">
        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
          <Building2 className="text-indigo-600 w-7 h-7" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mb-3">
          Organizer <span className="text-indigo-600">Identity</span>
        </h2>
        <p className="text-slate-500 font-medium">
          Tell us about your organization to get started.
        </p>
      </div>

      <div className="space-y-6">
        {/* Entity Name */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Entity Name <span className="text-indigo-600">*</span>
          </label>
          <input
            type="text"
            value={step1Data.entityName}
            onChange={(e) =>
              setStep1Data((prev) => ({ ...prev, entityName: e.target.value }))
            }
            placeholder="Enter your organization name"
            className="w-full p-5 bg-white border border-slate-200 rounded-2xl text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
          />
        </div>

        {/* Organizer Type */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Organizer Type <span className="text-indigo-600">*</span>
          </label>
          <div className="relative">
            <Users className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={step1Data.organizerType}
              onChange={(e) =>
                setStep1Data((prev) => ({ ...prev, organizerType: e.target.value }))
              }
              className="w-full pl-14 pr-5 py-5 bg-white border border-slate-200 rounded-2xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all appearance-none cursor-pointer"
            >
              <option value="">Select organizer type</option>
              {ORGANIZER_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg
                className="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Contact Phone */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Contact Phone <span className="text-indigo-600">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="tel"
              value={step1Data.contactPhone}
              onChange={(e) =>
                setStep1Data((prev) => ({
                  ...prev,
                  contactPhone: e.target.value,
                }))
              }
              placeholder="+1 (555) 000-0000"
              className="w-full pl-14 pr-5 py-5 bg-white border border-slate-200 rounded-2xl text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
            />
          </div>
        </div>

        {/* Social Media Account */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Social Media Account{" "}
            <span className="text-slate-400 font-normal">(LinkedIn preferred)</span>{" "}
            <span className="text-indigo-600">*</span>
          </label>
          <div className="relative">
            <Linkedin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={step1Data.socialMedia}
              onChange={(e) =>
                setStep1Data((prev) => ({
                  ...prev,
                  socialMedia: e.target.value,
                }))
              }
              placeholder="https://linkedin.com/company/your-org"
              className="w-full pl-14 pr-5 py-5 bg-white border border-slate-200 rounded-2xl text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Next Button */}
      <button
        onClick={onNext}
        disabled={!isStep1Valid()}
        className={`w-full mt-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
          isStep1Valid()
            ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200"
            : "bg-slate-200 text-slate-400 cursor-not-allowed"
        }`}
      >
        Next Step
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

/**
 * Step 2: Business Credentials Component Props
 */
interface Step2BusinessCredentialsProps {
  step2Data: Step2Data;
  setStep2Data: React.Dispatch<React.SetStateAction<Step2Data>>;
  onNext: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
  submitError?: string;
}

/**
 * Step 2: Business Credentials Component
 */
function Step2BusinessCredentials({
  step2Data,
  setStep2Data,
  onNext,
  onBack,
  isSubmitting,
  submitError,
}: Step2BusinessCredentialsProps) {
  /**
   * Check if Step 2 is valid
   */
  const isStep2Valid = (): boolean => {
    return (
      step2Data.website.trim() !== "" &&
      step2Data.gstTaxId.trim() !== "" &&
      step2Data.description.trim() !== ""
    );
  };

  return (
    <div className="bg-white p-8 sm:p-12 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-xl shadow-indigo-50/50">
      <div className="mb-8">
        <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mb-6">
          <FileText className="text-violet-600 w-7 h-7" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mb-3">
          Business <span className="text-indigo-600">Credentials</span>
        </h2>
        <p className="text-slate-500 font-medium">
          Provide your business details and track record.
        </p>
      </div>

      <div className="space-y-6">
        {/* Website */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Website <span className="text-indigo-600">*</span>
          </label>
          <div className="relative">
            <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={step2Data.website}
              onChange={(e) =>
                setStep2Data((prev) => ({ ...prev, website: e.target.value }))
              }
              placeholder="https://your-organization.com"
              className="w-full pl-14 pr-5 py-5 bg-white border border-slate-200 rounded-2xl text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
            />
          </div>
        </div>

        {/* GST / Tax ID */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            GST / Tax ID <span className="text-indigo-600">*</span>
          </label>
          <input
            type="text"
            value={step2Data.gstTaxId}
            onChange={(e) =>
              setStep2Data((prev) => ({ ...prev, gstTaxId: e.target.value }))
            }
            placeholder="Enter your GST or Tax ID"
            className="w-full p-5 bg-white border border-slate-200 rounded-2xl text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
          />
        </div>

        {/* Track Record */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Track Record <span className="text-indigo-600">*</span>
          </label>
          <textarea
            value={step2Data.description}
            onChange={(e) =>
              setStep2Data((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            placeholder="Describe your last 3 major events, footfall, sponsors, and scale..."
            rows={5}
            className="w-full p-5 bg-white border border-slate-200 rounded-2xl text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all resize-none"
          />
        </div>
      </div>

      {/* Error Message */}
      {submitError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-medium text-red-600">{submitError}</p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-4 mt-8">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all disabled:opacity-50"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!isStep2Valid() || isSubmitting}
          className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
            !isStep2Valid() || isSubmitting
              ? isSubmitting
                ? "bg-indigo-400 text-white cursor-not-allowed"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200"
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              Submit
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Step 3: Success Component Props
 */
interface Step3SuccessProps {
  step1Data: Step1Data;
  step2Data: Step2Data;
}

/**
 * Step 3: Success Component
 */
function Step3Success({ step1Data, step2Data }: Step3SuccessProps) {
  return (
    <div className="bg-slate-900 p-8 sm:p-12 rounded-[2rem] sm:rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 text-center">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-900/50">
          <Check className="text-white w-10 h-10" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-4">
          Welcome Aboard!
        </h2>

        <p className="text-slate-400 font-medium max-w-md mx-auto mb-8 leading-relaxed">
          Your organizer profile has been created successfully. Redirecting you
          to your dashboard...
        </p>

        {/* Summary Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-left">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm font-bold">Entity</span>
              <span className="text-white font-bold">{step1Data.entityName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm font-bold">Type</span>
              <span className="text-white font-bold">
                {ORGANIZER_TYPE_OPTIONS.find((o) => o.value === step1Data.organizerType)?.label}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm font-bold">Phone</span>
              <span className="text-white font-bold">
                {step1Data.contactPhone}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm font-bold">Website</span>
              <span className="text-white font-bold">{step2Data.website}</span>
            </div>
            <div className="pt-3 border-t border-white/10">
              <span className="text-slate-400 text-sm font-bold block mb-2">
                Track Record
              </span>
              <span className="text-indigo-400 font-bold text-sm line-clamp-2">
                {step2Data.description}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-indigo-400 text-sm font-bold">
          <Sparkles className="w-4 h-4" />
          Protected by Sponsiwise Protocol
        </div>
      </div>
    </div>
  );
}

/**
 * Organizer Onboarding Page - 3 Step Flow
 */
export default function OrganizerOnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data>({
    entityName: "",
    organizerType: "",
    contactPhone: "",
    socialMedia: "",
  });
  const [step2Data, setStep2Data] = useState<Step2Data>({
    website: "",
    gstTaxId: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  /**
   * Submit organizer onboarding data to backend
   */
  const submitOrganizerData = async (): Promise<boolean> => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await apiClient.post("/onboarding/organizer", {
        name: step1Data.entityName,
        type: step1Data.organizerType,
        contactPhone: step1Data.contactPhone,
        website: step2Data.website || undefined,
        pastRecords: step2Data.description,
        socialLinks: { linkedin: step1Data.socialMedia },
        taxId: step2Data.gstTaxId || undefined,
      });
      return true;
    } catch (err: any) {
      const message = err?.detail || err?.message || "Something went wrong. Please try again.";
      setSubmitError(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Proceed to next step
   */
  const handleNext = async () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const success = await submitOrganizerData();
      if (success) {
        setCurrentStep(3);
        // Redirect to dashboard after a brief delay
        setTimeout(() => {
          router.push("/organizer/dashboard");
        }, 2000);
      }
    }
  };

  /**
   * Go back to previous step
   */
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo />
          </div>
          <div className="text-sm font-bold text-slate-400">
            Step {currentStep} of 3
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-2xl mx-auto pt-32 sm:pt-40">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100">
            <Sparkles className="h-4 w-4" />
            Organizer Onboarding
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 mb-4">
            Let's set up your{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600">
              organizer profile
            </span>
          </h1>
          <p className="mt-4 text-base text-slate-500 sm:text-lg font-medium">
            Complete the steps below to join our premium organizer network.
          </p>
        </div>

        {/* Progress Stepper */}
        <ProgressStepper currentStep={currentStep} />

        {/* Step Content */}
        <div className="animate-fade-in">
          {currentStep === 1 && (
            <Step1OrganizerIdentity
              step1Data={step1Data}
              setStep1Data={setStep1Data}
              onNext={handleNext}
            />
          )}
          {currentStep === 2 && (
            <Step2BusinessCredentials
              step2Data={step2Data}
              setStep2Data={setStep2Data}
              onNext={handleNext}
              onBack={handleBack}
              isSubmitting={isSubmitting}
              submitError={submitError}
            />
          )}
          {currentStep === 3 && (
            <Step3Success step1Data={step1Data} step2Data={step2Data} />
          )}
        </div>

        {/* Footer */}
        <p className="text-center mt-8 text-xs text-slate-400">
          Protected by Sponsiwise Protocol. Secure & encrypted.
        </p>
      </div>
    </div>
  );
}
