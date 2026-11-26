"use server";

import { revalidatePath } from "next/cache";

import { getUser } from "@/lib/auth/session";
import { parseAbout, parseName } from "@/lib/onboarding/schema";
import { getProfile, saveAbout, saveName } from "@/lib/onboarding/store";

export type ProfileInput = {
  firstName: string;
  lastName: string;
  role: string;
  experience: string;
};

export type SaveProfileResult =
  | { ok: true }
  | { ok: false; error: "unauthenticated" | "invalid" | "server_error" };

export async function saveProfileAction(
  input: ProfileInput,
): Promise<SaveProfileResult> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "unauthenticated" };
    // Both parts are checked before either is saved.
    const name = parseName(input?.firstName, input?.lastName);
    const about = parseAbout(input?.role, input?.experience);
    const profile = await getProfile(user.id);
    if (!name.ok || !about.ok || !profile?.onboardedAt) {
      return { ok: false, error: "invalid" };
    }
    await saveName(user.id, name.first, name.last);
    await saveAbout(user.id, about.role, about.experience);
    revalidatePath("/feed");
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    console.error(
      "saveProfile failure",
      err instanceof Error ? err.message : "unknown",
    );
    return { ok: false, error: "server_error" };
  }
}
