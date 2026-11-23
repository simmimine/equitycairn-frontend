import type { Metadata } from "next";
import { Suspense } from "react";

import { OnboardingContent } from "./onboarding-content";
import { OnboardingFallback } from "@/components/onboarding/onboarding-shell";

export const metadata: Metadata = {
  title: "Welcome | EquityCairn",
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingFallback />}>
      <OnboardingContent />
    </Suspense>
  );
}
