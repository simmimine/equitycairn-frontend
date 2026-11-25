import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getFeed } from "@/lib/feed/get-feed";

import { FeedHarness } from "./harness";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Fixed, so story times and the time filters give the same result every run. */
const NOW = new Date("2026-11-25T12:00:00Z");

async function Content({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // Read the request first so this is rendered per request, never prerendered
  // (a prerender would bake in the env var as it was at build time).
  const q = await searchParams;
  if (process.env.E2E_FAKE_FEED !== "1") notFound();
  const tickers = (q.tickers ?? "AAPL,NVDA,MSFT")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const name = q.name ?? "Simeon";
  const feed = await getFeed(tickers, NOW);
  return <FeedHarness feed={feed} firstName={name || null} />;
}

/**
 * Test-only page: the real feed on mocked stories with a fake sign out, so
 * Playwright can exercise it without Supabase. 404s unless the e2e web server
 * (playwright.config.ts) turns it on.
 *
 * `?tickers=AAPL,NVDA,MSFT` (empty for none) and `?name=Simeon` (empty for none).
 */
export default function E2EFeedPage({
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
