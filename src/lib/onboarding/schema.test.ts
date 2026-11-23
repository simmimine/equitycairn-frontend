import { describe, expect, it } from "vitest";

import { parseAbout, parseName, parseTickers } from "./schema";

describe("parseName", () => {
  it("accepts and trims normal names", () => {
    expect(parseName(" Ann-Marie ", "O'Neil")).toEqual({
      ok: true,
      first: "Ann-Marie",
      last: "O'Neil",
    });
  });
  it("rejects markup", () => {
    expect(parseName("<script>", "x").ok).toBe(false);
  });
  it("rejects over 60 characters", () => {
    expect(parseName("a".repeat(61), "x").ok).toBe(false);
  });
  it("rejects empty and non-string", () => {
    expect(parseName("", "x").ok).toBe(false);
    expect(parseName(1, "x").ok).toBe(false);
  });
});

describe("parseAbout", () => {
  it("maps skipped answers to null", () => {
    expect(parseAbout("", "skip")).toEqual({
      ok: true,
      role: null,
      experience: null,
    });
  });
  it("accepts valid values", () => {
    expect(parseAbout("retail_investor", "beginner")).toEqual({
      ok: true,
      role: "retail_investor",
      experience: "beginner",
    });
  });
  it("rejects unknown values", () => {
    expect(parseAbout("king", "beginner").ok).toBe(false);
    expect(parseAbout("other", "guru").ok).toBe(false);
  });
});

describe("parseTickers", () => {
  it("splits, uppercases and dedupes", () => {
    expect(parseTickers("aapl, msft  tsla,AAPL")).toEqual({
      ok: true,
      tickers: ["AAPL", "MSFT", "TSLA"],
    });
  });
  it("allows empty input", () => {
    expect(parseTickers("")).toEqual({ ok: true, tickers: [] });
  });
  it("rejects invalid symbols", () => {
    expect(parseTickers("AAPL;DROP")).toEqual({ ok: false, error: "invalid" });
  });
  it("rejects more than 50", () => {
    const many = Array.from({ length: 51 }, (_, i) =>
      String.fromCharCode(65 + (i % 26)).repeat(1 + Math.floor(i / 26)),
    ).join(" ");
    expect(parseTickers(many)).toEqual({ ok: false, error: "too_many" });
  });
});
