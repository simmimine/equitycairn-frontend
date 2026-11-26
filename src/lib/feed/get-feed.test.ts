import { describe, expect, it } from "vitest";

import { filterStories } from "./filter";
import { getFeed } from "./get-feed";
import { NO_FILTERS, type TimeRange } from "./types";

const NOW = new Date("2026-11-24T10:00:00.000Z");
const THREE = ["AAPL", "NVDA", "MSFT"];
// 50 made-up tickers, letters only like real ones: TAA, TAB, ...
const letter = (n: number) => String.fromCharCode(65 + n);
const many = Array.from(
  { length: 50 },
  (_, i) => `T${letter(Math.floor(i / 26))}${letter(i % 26)}`,
);

describe("getFeed", () => {
  it("lists the followed companies in order", async () => {
    const feed = await getFeed(THREE, NOW);
    expect(feed.companies).toEqual([
      { ticker: "AAPL", name: "Apple Inc." },
      { ticker: "NVDA", name: "NVIDIA" },
      { ticker: "MSFT", name: "Microsoft" },
    ]);
    expect(feed.generatedAt).toBe(NOW.toISOString());
  });

  it("returns stories newest first, led by the boards' three", async () => {
    const { stories } = await getFeed(THREE, NOW);
    const times = stories.map((s) => s.publishedAt);
    expect(times).toEqual([...times].sort().reverse());
    expect(stories.slice(0, 3)).toMatchObject([
      {
        ticker: "AAPL",
        headline: "Example coverage: company updates its services lineup",
        publisher: "Example Publisher",
        kind: "news",
        linkCount: 3,
      },
      {
        ticker: "NVDA",
        headline: "Example coverage: new platform draws data-center interest",
        publisher: "Example Wire",
        kind: "news",
        linkCount: 1,
      },
      {
        ticker: "MSFT",
        headline:
          "Example filing: quarterly report adds context to company updates",
        publisher: "Company filing",
        kind: "filing",
      },
    ]);
  });

  it("uses only placeholder publishers", async () => {
    const { stories } = await getFeed([...THREE, "ZZZZ", "BRK.B"], NOW);
    for (const story of stories) {
      expect(story.publisher).toEqual(
        story.kind === "filing"
          ? "Company filing"
          : expect.stringMatching(/^Example (Publisher|Wire)$/),
      );
      expect(story.headline).toMatch(/^Example (coverage|filing): /);
    }
  });

  it("flags only stories from the last hour as new", async () => {
    const { stories } = await getFeed(THREE, NOW);
    for (const story of stories) {
      const age = NOW.getTime() - Date.parse(story.publishedAt);
      expect(story.isNew).toBe(age < 60 * 60 * 1000);
    }
    expect(stories.some((s) => s.isNew)).toBe(true);
  });

  it.each([[["ZZZZ", "BRK.B"]], [many]])(
    "covers every ticker with safe, unique stories",
    async (tickers) => {
      const { stories } = await getFeed(tickers, NOW);
      expect(new Set(stories.map((s) => s.ticker))).toEqual(new Set(tickers));
      expect(new Set(stories.map((s) => s.id)).size).toBe(stories.length);
      expect(stories.length).toBeGreaterThanOrEqual(tickers.length);
      for (const story of stories) {
        expect(story.originalUrl.startsWith("https://example.com/")).toBe(true);
      }
    },
  );

  it("keeps all of a 50-ticker watchlist in the past 24 hours", async () => {
    expect(many.every((ticker) => /^[A-Z]+$/.test(ticker))).toBe(true);
    const { stories, companies, generatedAt } = await getFeed(many, NOW);
    const recent = filterStories(
      stories,
      companies,
      { ...NO_FILTERS, time: "24h" },
      generatedAt,
    );
    expect(new Set(recent.map((s) => s.ticker))).toEqual(new Set(many));
  });

  it("leaves unknown tickers unnamed", async () => {
    const { companies } = await getFeed(["ZZZZ", "BRK.B"], NOW);
    expect(companies.map((c) => c.name)).toEqual([null, null]);
  });

  it("is empty for an empty watchlist", async () => {
    const feed = await getFeed([], NOW);
    expect(feed.companies).toEqual([]);
    expect(feed.stories).toEqual([]);
  });

  it("is deterministic for the same input and time", async () => {
    expect(await getFeed(many, NOW)).toEqual(await getFeed(many, NOW));
  });

  it("defaults to the current time", async () => {
    const before = Date.now();
    const { generatedAt } = await getFeed(THREE);
    expect(Date.parse(generatedAt)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(generatedAt)).toBeLessThanOrEqual(Date.now());
  });

  it.each([[THREE], [["ZZZZ", "BRK.B", "KO"]]])(
    "gives each time range a different, non-zero count for %j",
    async (tickers) => {
      const { stories, companies, generatedAt } = await getFeed(tickers, NOW);
      const counts = (["24h", "7d", "30d", "any"] as TimeRange[]).map(
        (time) =>
          filterStories(
            stories,
            companies,
            { ...NO_FILTERS, time },
            generatedAt,
          ).length,
      );
      expect(new Set(counts).size).toBe(4);
      expect(Math.min(...counts)).toBeGreaterThan(0);
    },
  );
});
