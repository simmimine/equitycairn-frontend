"use server";

import { redirect } from "next/navigation";

import { getUser } from "@/lib/auth/session";
import { parseAbout, parseName, parseTickers } from "@/lib/onboarding/schema";
import {
  getProfile,
  markOnboarded,
  saveAbout,
  saveName,
  saveWatchlist,
} from "@/lib/onboarding/store";

export type OnboardingResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "unauthenticated"
        | "already_onboarded"
        | "invalid"
        | "too_many"
        | "server_error";
    };

type Guard =
  | { ok: true; userId: string; hasName: boolean }
  | { ok: false; error: "unauthenticated" | "already_onboarded" };

// Every action re-checks the session; the proxy is not a security boundary.
async function guard(): Promise<Guard> {
  const user = await getUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  const profile = await getProfile(user.id);
  if (profile?.onboardedAt) return { ok: false, error: "already_onboarded" };
  return { ok: true, userId: user.id, hasName: Boolean(profile?.firstName) };
}

async function run(
  work: (userId: string, hasName: boolean) => Promise<OnboardingResult>,
): Promise<OnboardingResult> {
  try {
    const g = await guard();
    if (!g.ok) return g;
    return await work(g.userId, g.hasName);
  } catch (err) {
    console.error(
      "onboarding unexpected failure",
      err instanceof Error ? err.message : "unknown",
    );
    return { ok: false, error: "server_error" };
  }
}

export async function saveNameAction(
  first: string,
  last: string,
): Promise<OnboardingResult> {
  return run(async (userId) => {
    const parsed = parseName(first, last);
    if (!parsed.ok) return { ok: false, error: "invalid" };
    await saveName(userId, parsed.first, parsed.last);
    return { ok: true };
  });
}

export async function saveAboutAction(
  role: string,
  experience: string,
): Promise<OnboardingResult> {
  return run(async (userId, hasName) => {
    const parsed = parseAbout(role, experience);
    if (!parsed.ok || !hasName) return { ok: false, error: "invalid" };
    await saveAbout(userId, parsed.role, parsed.experience);
    return { ok: true };
  });
}

export async function saveWatchlistAction(
  input: string,
): Promise<OnboardingResult> {
  return run(async (userId, hasName) => {
    const parsed = parseTickers(input);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    if (!hasName) return { ok: false, error: "invalid" };
    await saveWatchlist(userId, parsed.tickers);
    return { ok: true };
  });
}

export async function finishOnboardingAction(): Promise<OnboardingResult> {
  const result = await run(async (userId, hasName) => {
    if (!hasName) return { ok: false, error: "invalid" };
    await markOnboarded(userId);
    return { ok: true };
  });
  if (!result.ok) return result;
  // Outside the try block: redirect() throws a control-flow error.
  redirect("/feed");
}
