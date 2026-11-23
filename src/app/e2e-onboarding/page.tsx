import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { OnboardingHarness } from "./harness";
import type { OnboardingStep } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const STEPS: OnboardingStep[] = ["name", "about", "welcome", "watchlist"];

async function Content({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // Read the request first so this is rendered per request, never prerendered
  // (a prerender would bake in the env var as it was at build time).
  const q = await searchParams;
  if (process.env.E2E_FAKE_ONBOARDING !== "1") notFound();
  const start = STEPS.find((s) => s === q.step) ?? "name";
  return (
    <OnboardingHarness
      startStep={start}
      tickers={q.tickers ?? ""}
      fail={q.fail ?? ""}
      delayMs={Number(q.delay) || 0}
    />
  );
}

/**
 * Test-only page: the real onboarding flow wired to in-memory fake actions, so
 * Playwright can exercise the UI without Supabase. 404s unless the e2e web server
 * (playwright.config.ts) turns it on.
 */
export default function E2EOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <Suspense fallback={null}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
