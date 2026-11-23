import type { Metadata } from "next";
import { Suspense } from "react";

import { OnboardingContent } from "./onboarding-content";
import { JoinBetaShell } from "@/components/join-beta/join-beta-shell";

export const metadata: Metadata = {
  title: "Welcome | EquityCairn",
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <JoinBetaShell>
          <p role="status" className="sr-only">
            Loading…
          </p>
        </JoinBetaShell>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
