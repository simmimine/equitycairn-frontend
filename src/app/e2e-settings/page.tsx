import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SettingsHarness } from "./harness";

export const metadata: Metadata = { robots: { index: false, follow: false } };

async function Content({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  // Read the request first so this is rendered per request, never prerendered.
  const { view } = await searchParams;
  if (process.env.E2E_FAKE_SETTINGS !== "1") notFound();
  return <SettingsHarness view={view ?? null} />;
}

/**
 * Test-only page: the real settings screens with fake actions, so Playwright can
 * exercise them without Supabase. 404s unless the e2e web server turns it on.
 *
 * `?view=confirm-password` or `?view=confirm-delete` for the emailed link's page.
 */
export default function E2ESettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
