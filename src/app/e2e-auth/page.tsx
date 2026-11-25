import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AuthHarness } from "./harness";

export const metadata: Metadata = { robots: { index: false, follow: false } };

async function Content({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // Read the request first so this is rendered per request, never prerendered.
  const params = await searchParams;
  if (process.env.E2E_FAKE_AUTH !== "1") notFound();
  return <AuthHarness params={params} />;
}

/**
 * Test-only page: the real sign-up and login screens wired to fake actions, so
 * Playwright can reach every state without Supabase or email. 404s unless the
 * e2e web server (playwright.config.ts) turns it on.
 */
export default function E2EAuthPage({
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
