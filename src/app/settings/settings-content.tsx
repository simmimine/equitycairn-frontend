import { redirect } from "next/navigation";

import { requestAccountLink } from "@/app/actions/account-link";
import { reportBugAction } from "@/app/actions/bug-report";
import { signOut, signOutEverywhere } from "@/app/actions/login";
import { saveProfileAction } from "@/app/actions/settings";
import { SettingsApp } from "@/components/settings/settings-app";
import { requireUser } from "@/lib/auth/session";
import { parsePagePath } from "@/lib/bugs/schema";
import { getProfile } from "@/lib/onboarding/store";

export async function SettingsContent({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const { from } = await searchParams;
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile?.onboardedAt) redirect("/onboarding");

  return (
    // Keyed so typed text kept by a hidden route never passes to another user.
    <SettingsApp
      key={user.id}
      profile={{
        firstName: profile.firstName ?? "",
        lastName: profile.lastName ?? "",
        role: profile.role,
        experience: profile.experience,
      }}
      email={user.email ?? ""}
      supportEmail={process.env.SUPPORT_EMAIL?.trim() || null}
      fromPath={parsePagePath(from)}
      actions={{
        saveProfile: saveProfileAction,
        requestLink: requestAccountLink,
        reportBug: reportBugAction,
        signOut,
        signOutEverywhere,
      }}
    />
  );
}
