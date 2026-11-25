import { describe, expect, it } from "vitest";

import { filterStories, sourcesOf } from "./filter";
import {
  NO_FILTERS,
  type Company,
  type FeedFilters,
  type Story,
} from "./types";

const NOW = "2026-11-24T10:00:00.000Z";
const HOUR = 60 * 60 * 1000;

const companies: Company[] = [
  { ticker: "AAPL", name: "Apple Inc." },
  { ticker: "NVDA", name: "NVIDIA" },
  { ticker: "ZZZZ", name: null },
];

function story(
  id: string,
  ticker: string,
  publisher: string,
  ageMs: number,
  headline = "Example headline",
): Story {
  return {
    id,
    ticker,
    headline,
    publisher,
    kind: "news",
    publishedAt: new Date(Date.parse(NOW) - ageMs).toISOString(),
    linkCount: 1,
    originalUrl: `https://example.com/${id}`,
    isNew: false,
  };
}

// Deliberately not newest-first, to show that order is kept rather than sorted.
const stories = [
  story("week", "NVDA", "Example Wire", 7 * 24 * HOUR),
  story("day", "AAPL", "Example Publisher", 24 * HOUR, "Services lineup"),
  story("overDay", "AAPL", "Example Wire", 24 * HOUR + 1),
  story("month", "ZZZZ", "Example Publisher", 30 * 24 * HOUR),
  story("old", "ZZZZ", "Example Wire", 30 * 24 * HOUR + 1),
];

const ids = (filters: Partial<FeedFilters>) =>
  filterStories(stories, companies, { ...NO_FILTERS, ...filters }, NOW).map(
    (s) => s.id,
  );

describe("filterStories", () => {
  it("keeps everything, in input order, with no filters", () => {
    expect(ids({})).toEqual(["week", "day", "overDay", "month", "old"]);
  });

  it("filters by ticker", () => {
    expect(ids({ ticker: "AAPL" })).toEqual(["day", "overDay"]);
  });

  it.each([
    ["24h", ["day"]],
    ["7d", ["week", "day", "overDay"]],
    ["30d", ["week", "day", "overDay", "month"]],
  ] as const)("filters by %s, including the boundary", (time, expected) => {
    expect(ids({ time })).toEqual(expected);
  });

  it("filters by source", () => {
    expect(ids({ source: "Example Publisher" })).toEqual(["day", "month"]);
  });

  it.each([
    ["headline", "  SERVICES line ", ["day"]],
    ["ticker", "nvda", ["week"]],
    ["company name", "apple", ["day", "overDay"]],
    ["publisher", "publisher", ["day", "month"]],
    ["blank", "   ", ["week", "day", "overDay", "month", "old"]],
    ["nothing", "undefined", []],
    ["nothing for unnamed companies", "null", []],
  ])("searches: %s", (_, query, expected) => {
    expect(ids({ query })).toEqual(expected);
  });

  it("combines filters", () => {
    expect(
      ids({
        ticker: "AAPL",
        time: "7d",
        source: "Example Wire",
        query: "apple",
      }),
    ).toEqual(["overDay"]);
    expect(ids({ ticker: "NVDA", query: "apple" })).toEqual([]);
  });
});

describe("sourcesOf", () => {
  it("lists each publisher once, alphabetically", () => {
    expect(sourcesOf(stories)).toEqual(["Example Publisher", "Example Wire"]);
    expect(sourcesOf([...stories].reverse())).toEqual([
      "Example Publisher",
      "Example Wire",
    ]);
    expect(sourcesOf([])).toEqual([]);
  });
});
