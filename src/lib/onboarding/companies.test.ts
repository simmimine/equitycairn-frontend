import { describe, expect, it } from "vitest";

import {
  CATEGORIES,
  MAX_PICKS,
  POPULAR_COMPANIES,
  filterCompanies,
  parseStored,
  tickerCandidate,
  toggleTicker,
} from "./companies";
import { parseTickers } from "./schema";

describe("POPULAR_COMPANIES", () => {
  it("has unique tickers that the server schema accepts", () => {
    const tickers = POPULAR_COMPANIES.map((c) => c.ticker);
    expect(new Set(tickers).size).toBe(tickers.length);
    expect(parseTickers(tickers.join(" "))).toEqual({
      ok: true,
      tickers,
    });
  });

  it("only uses listed categories", () => {
    for (const c of POPULAR_COMPANIES) expect(CATEGORIES).toContain(c.category);
  });
});

describe("filterCompanies", () => {
  it("returns everything for an empty query and All", () => {
    expect(filterCompanies("", "All")).toEqual(POPULAR_COMPANIES);
    expect(filterCompanies("   ", "All")).toEqual(POPULAR_COMPANIES);
  });

  it("filters by category", () => {
    const out = filterCompanies("", "Finance");
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((c) => c.category === "Finance")).toBe(true);
  });

  it("matches company name or ticker case-insensitively", () => {
    expect(filterCompanies("apple", "All").map((c) => c.ticker)).toEqual([
      "AAPL",
    ]);
    expect(filterCompanies("msft", "All").map((c) => c.ticker)).toEqual([
      "MSFT",
    ]);
  });

  it("combines query and category", () => {
    expect(filterCompanies("apple", "Finance")).toEqual([]);
  });

  it("treats regex characters literally", () => {
    expect(filterCompanies(".*", "All")).toEqual([]);
  });
});

describe("tickerCandidate", () => {
  it("offers an uppercase ticker for ticker-like text not in the list", () => {
    expect(tickerCandidate("zzzz", [])).toBe("ZZZZ");
    expect(tickerCandidate(" brk.b ", [])).toBe("BRK.B");
  });

  it("offers nothing for popular tickers, selected tickers or non-tickers", () => {
    expect(tickerCandidate("aapl", [])).toBeNull();
    expect(tickerCandidate("zzzz", ["ZZZZ"])).toBeNull();
    expect(tickerCandidate("abcdefg", [])).toBeNull();
    expect(tickerCandidate("ab1", [])).toBeNull();
    expect(tickerCandidate("two words", [])).toBeNull();
    expect(tickerCandidate("", [])).toBeNull();
  });
});

describe("toggleTicker", () => {
  it("adds and removes", () => {
    expect(toggleTicker([], "AAPL")).toEqual({
      selected: ["AAPL"],
      limited: false,
    });
    expect(toggleTicker(["AAPL", "MSFT"], "AAPL")).toEqual({
      selected: ["MSFT"],
      limited: false,
    });
  });

  it("refuses to exceed the cap but still allows removal", () => {
    const full = POPULAR_COMPANIES.slice(0, MAX_PICKS).map((c) => c.ticker);
    expect(toggleTicker(full, "ZZZZ")).toEqual({
      selected: full,
      limited: true,
    });
    expect(toggleTicker(full, full[0]).selected).toHaveLength(MAX_PICKS - 1);
  });
});

describe("parseStored", () => {
  it("splits, uppercases and dedupes stored tickers", () => {
    expect(parseStored("aapl, MSFT  aapl")).toEqual(["AAPL", "MSFT"]);
    expect(parseStored("")).toEqual([]);
  });

  it("keeps tickers outside the popular list", () => {
    expect(parseStored("ZZZZ, AAPL")).toEqual(["ZZZZ", "AAPL"]);
  });
});
