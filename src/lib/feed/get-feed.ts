import { companyName } from "./format";
import type { Feed, Story } from "./types";

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

type Sample = Pick<Story, "headline" | "publisher" | "kind" | "linkCount">;

/** The three stories on the design boards. */
const BOARD_SAMPLES: Record<string, Sample> = {
  AAPL: {
    headline: "Example coverage: company updates its services lineup",
    publisher: "Example Publisher",
    kind: "news",
    linkCount: 3,
  },
  NVDA: {
    headline: "Example coverage: new platform draws data-center interest",
    publisher: "Example Wire",
    kind: "news",
    linkCount: 1,
  },
  MSFT: {
    headline:
      "Example filing: quarterly report adds context to company updates",
    publisher: "Company filing",
    kind: "filing",
    linkCount: 1,
  },
};

const LATEST: Sample = {
  headline: "Example coverage: company shares a business update",
  publisher: "Example Publisher",
  kind: "news",
  linkCount: 2,
};

// One older story per ticker, taken in turn, so that each time range shows a different set.
const OLDER: (Sample & { age: number })[] = [
  {
    headline: "Example coverage: leadership outlines plans for the year",
    publisher: "Example Wire",
    kind: "news",
    linkCount: 2,
    age: 3 * DAY,
  },
  {
    headline: "Example filing: current report notes a company event",
    publisher: "Company filing",
    kind: "filing",
    linkCount: 1,
    age: 14 * DAY,
  },
  {
    headline: "Example coverage: analysts revisit the product roadmap",
    publisher: "Example Publisher",
    kind: "news",
    linkCount: 1,
    age: 45 * DAY,
  },
];

/**
 * Mock feed: sample stories only, all linking to example.com. The backend replaces this.
 * `tickers` is the user's watchlist, at most 50 long.
 */
export async function getFeed(
  tickers: string[],
  now: Date = new Date(),
): Promise<Feed> {
  const toStory = (
    ticker: string,
    slot: "latest" | "older",
    { headline, publisher, kind, linkCount }: Sample,
    age: number,
  ): Story => ({
    id: `${ticker}-${slot}`,
    ticker,
    headline,
    publisher,
    kind,
    linkCount,
    publishedAt: new Date(now.getTime() - age).toISOString(),
    originalUrl: `https://example.com/${encodeURIComponent(ticker)}/${slot}`,
    isNew: age < 60 * MINUTE,
  });

  const stories = tickers.flatMap((ticker, i) => {
    // Spaced so that 50 latest stories all stay inside the past 24 hours.
    const offset = (18 + i * 25) * MINUTE;
    const older = OLDER[i % OLDER.length];
    return [
      toStory(ticker, "latest", BOARD_SAMPLES[ticker] ?? LATEST, offset),
      toStory(ticker, "older", older, older.age + offset),
    ];
  });

  return {
    companies: tickers.map((ticker) => ({
      ticker,
      name: companyName(ticker),
    })),
    // ISO strings in UTC sort as text.
    stories: stories.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    generatedAt: now.toISOString(),
  };
}
