import { POPULAR_COMPANIES } from "@/lib/onboarding/companies";

import type { Story } from "./types";

// Spelled out rather than taken from Intl: server and browser must render the same text.
const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

export function formatPublished(iso: string): string {
  const date = new Date(iso);
  const time = date.toISOString().slice(11, 16);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} · ${time} UTC`;
}

export function coverageLabel(story: Story): string {
  if (story.kind === "filing") return "Filed document · original link";
  if (story.linkCount === 1) return "1 sample link";
  return `${story.linkCount} sample links grouped`;
}

export function companyName(ticker: string): string | null {
  const company = POPULAR_COMPANIES.find((c) => c.ticker === ticker);
  return company?.name.replace(/ (Corporation|Incorporated)$/, "") ?? null;
}

/**
 * The URL when it is an absolute http(s) address, else null: a story's link
 * comes from outside data, and a `javascript:` or `data:` href would run code
 * on click.
 */
export function webLink(url: string): string | null {
  let protocol: string;
  try {
    ({ protocol } = new URL(url));
  } catch {
    return null; // Not an absolute URL.
  }
  return protocol === "http:" || protocol === "https:" ? url : null;
}
