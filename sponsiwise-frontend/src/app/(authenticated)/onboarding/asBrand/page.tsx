"use client";

import { useState } from "react";
import { 
  Building2, 
  Globe, 
  Briefcase, 
  ArrowRight, 
  Check, 
  Shield, 
  Sparkles,
  ChevronLeft,
  Loader2
} from "lucide-react";
import Logo from "@/components/logo/logo";
import { apiClient } from "@/lib/api-client";

/**
 * Industry options for the dropdown
 */
const INDUSTRY_OPTIONS = [
  { value: "TECHNOLOGY", label: "Technology" },
  { value: "FINANCE", label: "Finance" },
  { value: "FMCG", label: "FMCG" },
  { value: "HEALTHCARE_PHARMA", label: "Healthcare & Pharma" },
  { value: "RETAIL_ECOMMERCE", label: "Retail & E-Commerce" },
  { value: "MANUFACTURING_INDUSTRIAL", label: "Manufacturing & Industrial" },
  { value: "MEDIA_ENTERTAINMENT", label: "Media & Entertainment" },
  { value: "EDUCATION", label: "Education" },
  { value: "ENERGY_UTILITIES", label: "Energy & Utilities" },
  { value: "REAL_ESTATE_CONSTRUCTION", label: "Real Estate & Construction" },
  { value: "LOGISTICS_TRANSPORTATION", label: "Logistics & Transportation" },
  { value: "TELECOM", label: "Telecom" },
  { value: "OTHER", label: "Other" },
] as const;

/**
 * Strategic intent options for multi-select
 */
const INTENT_OPTIONS = [
  "Brand Awareness",
  "Lead Generation",
  "Product Launch",
  "Community Building",
  "Culture Positioning",
  "Market Expansion",
] as const;

/**
 * URL validation regex
 */
const URL_REGEX = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/;

/**
 * Step 1: Brand Identity Form
 */
interface Step1Data {
  companyName: string;
  website: string;
  industry: string;
}

/**
 * Step 2: Strategic Intent Data
 */
interface Step2Data {
  selectedIntents: string[];
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
            {step < currentStep ? (
              <Check className="w-5 h-5" />
            ) : (
              step
            )}
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
 * Step 1: Brand Identity Component Props
 */
interface Step1BrandIdentityProps {
  step1Data: Step1Data;
  setStep1Data: React.Dispatch<React.SetStateAction<Step1Data>>;
  websiteError: string;
  setWebsiteError: React.Dispatch<React.SetStateAction<string>>;
  onNext: () => void;
}

/**
 * Step 1: Brand Identity Component
 */
function Step1BrandIdentity({
  step1Data,
  setStep1Data,
  websiteError,
  setWebsiteError,
  onNext,
}: Step1BrandIdentityProps) {
  /**
   * Validate website URL
   */
  const validateWebsite = (url: string): boolean => {
    if (!url) return true;
    const isValid = URL_REGEX.test(url);
    if (!isValid) {
      setWebsiteError("Please enter a valid URL (e.g., https://example.com)");
    } else {
      setWebsiteError("");
    }
    return isValid;
  };

  /**
   * Handle website input change
   */
  const handleWebsiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStep1Data((prev) => ({ ...prev, website: value }));
    if (value) {
      validateWebsite(value);
    } else {
      setWebsiteError("");
    }
  };

  /**
   * Check if Step 1 is valid
   */
  const isStep1Valid = (): boolean => {
    return (
      step1Data.companyName.trim() !== "" &&
      step1Data.industry !== "" &&
      (step1Data.website === "" || validateWebsite(step1Data.website))
    );
  };

  return (
    <div className="bg-white p-8 sm:p-12 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-xl shadow-indigo-50/50">
      <div className="mb-8">
        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
          <Building2 className="text-indigo-600 w-7 h-7" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mb-3">
          Brand Identity
        </h2>
        <p className="text-slate-500 font-medium">
          Tell us about your company to get started.
        </p>
      </div>

      <div className="space-y-6">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Company Name <span className="text-indigo-600">*</span>
          </label>
          <input
            type="text"
            value={step1Data.companyName}
            onChange={(e) =>
              setStep1Data((prev) => ({ ...prev, companyName: e.target.value }))
            }
            placeholder="Enter your company name"
            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Website <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={step1Data.website}
              onChange={handleWebsiteChange}
              onBlur={() => validateWebsite(step1Data.website)}
              placeholder="https://example.com"
              className={`w-full pl-12 pr-5 py-4 bg-slate-50 border rounded-2xl text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                websiteError ? "border-red-300 focus:ring-red-500" : "border-slate-200"
              }`}
            />
          </div>
          {websiteError && (
            <p className="mt-2 text-sm font-medium text-red-500">{websiteError}</p>
          )}
        </div>

        {/* Industry Dropdown */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Industry <span className="text-indigo-600">*</span>
          </label>
          <div className="relative">
            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={step1Data.industry}
              onChange={(e) =>
                setStep1Data((prev) => ({ ...prev, industry: e.target.value }))
              }
              className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer"
            >
              <option value="">Select your industry</option>
              {INDUSTRY_OPTIONS.map((option) => (
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
        Continue to Strategic Intent
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

/**
 * Step 2: Strategic Intent Component Props
 */
interface Step2StrategicIntentProps {
  step2Data: Step2Data;
  setStep2Data: React.Dispatch<React.SetStateAction<Step2Data>>;
  onNext: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
  submitError?: string;
}

/**
 * Step 2: Strategic Intent Component
 */
function Step2StrategicIntent({
  step2Data,
  setStep2Data,
  onNext,
  onBack,
  isSubmitting,
  submitError,
}: Step2StrategicIntentProps) {
  /**
   * Handle intent selection toggle
   */
  const toggleIntent = (intent: string) => {
    setStep2Data((prev) => {
      const newIntents = prev.selectedIntents.includes(intent)
        ? prev.selectedIntents.filter((i) => i !== intent)
        : [...prev.selectedIntents, intent];
      
      return {
        selectedIntents: newIntents,
        description: newIntents.join(", "),
      };
    });
  };

  return (
    <div className="bg-white p-8 sm:p-12 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-xl shadow-indigo-50/50">
      <div className="mb-8">
        <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mb-6">
          <Sparkles className="text-violet-600 w-7 h-7" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mb-3">
          Strategic Intent
        </h2>
        <p className="text-slate-500 font-medium">
          Select your primary objectives. You can choose multiple.
        </p>
      </div>

      {/* Intent Cards Grid */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {INTENT_OPTIONS.map((intent) => {
          const isSelected = step2Data.selectedIntents.includes(intent);
          return (
            <button
              key={intent}
              onClick={() => toggleIntent(intent)}
              className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50/50 shadow-lg shadow-indigo-100"
                  : "border-slate-200 bg-slate-50 hover:border-indigo-200 hover:bg-white"
              }`}
            >
              <div className="flex items-start justify-between">
                <span
                  className={`font-bold ${
                    isSelected ? "text-indigo-900" : "text-slate-700"
                  }`}
                >
                  {intent}
                </span>
                {isSelected && (
                  <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Count */}
      {step2Data.selectedIntents.length > 0 && (
        <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <p className="text-sm font-bold text-indigo-900">
            Selected ({step2Data.selectedIntents.length}):{" "}
            <span className="font-medium">{step2Data.description}</span>
          </p>
        </div>
      )}

      {/* Error Message */}
      {submitError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-medium text-red-600">{submitError}</p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={isSubmitting}
          className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
            isSubmitting
              ? "bg-indigo-400 text-white cursor-not-allowed"
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
              Submit & Continue
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Step 3: Verification Pending Component Props
 */
interface Step3VerificationProps {
  step1Data: Step1Data;
  step2Data: Step2Data;
}

/**
 * Step 3: Verification Pending Component
 */
function Step3Verification({ step1Data, step2Data }: Step3VerificationProps) {
  return (
    <div className="bg-slate-900 p-8 sm:p-12 rounded-[2rem] sm:rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[100px] pointer-events-none"></div>
      
      <div className="relative z-10 text-center">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-900/50">
          <Shield className="text-white w-10 h-10" />
        </div>
        
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-4">
          Verification Pending
        </h2>
        
        <p className="text-slate-400 font-medium max-w-md mx-auto mb-8 leading-relaxed">
          Your brand profile is under review. Our Concierge team will verify your details and activate your account within 24-48 hours.
        </p>

        {/* Summary Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-left">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm font-bold">Company</span>
              <span className="text-white font-bold">{step1Data.companyName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm font-bold">Industry</span>
              <span className="text-white font-bold">
                {INDUSTRY_OPTIONS.find((i) => i.value === step1Data.industry)?.label}
              </span>
            </div>
            {step1Data.website && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm font-bold">Website</span>
                <span className="text-white font-bold">{step1Data.website}</span>
              </div>
            )}
            <div className="pt-3 border-t border-white/10">
              <span className="text-slate-400 text-sm font-bold block mb-2">Strategic Intent</span>
              <span className="text-indigo-400 font-bold text-sm">{step2Data.description}</span>
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
 * Brand Onboarding Page - 3 Step Flow
 */
export default function BrandOnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data>({
    companyName: "",
    website: "",
    industry: "",
  });
  const [step2Data, setStep2Data] = useState<Step2Data>({
    selectedIntents: [],
    description: "",
  });
  const [websiteError, setWebsiteError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  /**
   * Submit sponsor onboarding data to backend
   */
  const submitSponsorData = async (): Promise<boolean> => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await apiClient.post("/onboarding/sponsor", {
        name: step1Data.companyName,
        type: step1Data.industry,
        website: step1Data.website || undefined,
        strategicIntent: step2Data.selectedIntents.join(", ") || undefined,
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
      const success = await submitSponsorData();
      if (success) {
        setCurrentStep(3);
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
            Brand Onboarding
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 mb-4">
            Let's set up your{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600">
              brand profile
            </span>
          </h1>
          <p className="mt-4 text-base text-slate-500 sm:text-lg font-medium">
            Complete the steps below to join our premium brand network.
          </p>
        </div>

        {/* Progress Stepper */}
        <ProgressStepper currentStep={currentStep} />

        {/* Step Content */}
        <div className="animate-fade-in">
          {currentStep === 1 && (
            <Step1BrandIdentity
              step1Data={step1Data}
              setStep1Data={setStep1Data}
              websiteError={websiteError}
              setWebsiteError={setWebsiteError}
              onNext={handleNext}
            />
          )}
          {currentStep === 2 && (
            <Step2StrategicIntent
              step2Data={step2Data}
              setStep2Data={setStep2Data}
              onNext={handleNext}
              onBack={handleBack}
              isSubmitting={isSubmitting}
              submitError={submitError}
            />
          )}
          {currentStep === 3 && (
            <Step3Verification step1Data={step1Data} step2Data={step2Data} />
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
