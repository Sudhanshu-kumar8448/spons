import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding | SponsiWise",
  description: "Complete your onboarding to get started with SponsiWise.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
