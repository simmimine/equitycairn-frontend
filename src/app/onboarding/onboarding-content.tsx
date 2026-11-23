import { redirect } from "next/navigation";

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/onboarding/store";

export async function OnboardingContent() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (profile?.onboardedAt) redirect("/feed");

  return (
    <OnboardingFlow
      startStep={profile?.firstName ? "about" : "name"}
      initial={{
        firstName: profile?.firstName ?? "",
        lastName: profile?.lastName ?? "",
        role: profile?.role ?? "",
        experience: profile?.experience ?? "",
        tickers: profile?.tickers.join(", ") ?? "",
      }}
    />
  );
}
