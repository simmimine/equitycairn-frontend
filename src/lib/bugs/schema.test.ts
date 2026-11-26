import { describe, expect, it } from "vitest";

import { parseBugReport, parsePagePath } from "./schema";

const INPUT = {
  whatHappened: " It broke ",
  expected: "",
  pagePath: "/feed",
  browser: "Firefox",
  screen: "390x844",
};

describe("parsePagePath", () => {
  it.each(["/", "/feed", "/a/b-c_d"])("keeps %s", (p) => {
    expect(parsePagePath(p)).toBe(p);
  });
  it.each([
    "//evil.com",
    "https://x",
    "/feed?q=1",
    "/feed#a",
    "feed",
    `/${"a".repeat(200)}`,
    undefined,
    ["/feed"],
  ])("drops %s", (p) => {
    expect(parsePagePath(p)).toBeNull();
  });
});

describe("parseBugReport", () => {
  it("trims and turns empty optional fields into null", () => {
    expect(parseBugReport(INPUT)).toEqual({
      ok: true,
      report: {
        whatHappened: "It broke",
        expected: null,
        pagePath: "/feed",
        browser: "Firefox",
        screen: "390x844",
      },
    });
  });

  it.each(["", "   \n ", "\u0000\u0000", "a".repeat(2001), undefined])(
    "rejects %j as what happened",
    (whatHappened) => {
      expect(parseBugReport({ ...INPUT, whatHappened })).toEqual({ ok: false });
    },
  );

  it("rejects an over-long expectation and a missing payload", () => {
    expect(parseBugReport({ ...INPUT, expected: "a".repeat(2001) })).toEqual({
      ok: false,
    });
    expect(parseBugReport(null)).toEqual({ ok: false });
  });

  it("strips NUL characters, which Postgres refuses, from every field", () => {
    const result = parseBugReport({
      whatHappened: "a\u0000b",
      expected: "c\u0000d",
      pagePath: "/fe\u0000ed",
      browser: "e\u0000f",
      screen: "39\u00000x844",
    });
    expect(result).toEqual({
      ok: true,
      report: {
        whatHappened: "ab",
        expected: "cd",
        pagePath: "/feed",
        browser: "ef",
        screen: "390x844",
      },
    });
  });

  it("never rejects a report over a bad optional detail", () => {
    const result = parseBugReport({
      ...INPUT,
      pagePath: "//evil.com",
      browser: "b".repeat(600),
      screen: "huge",
    });
    expect(result).toMatchObject({
      ok: true,
      report: { pagePath: null, screen: null },
    });
    expect(result.ok && result.report.browser).toHaveLength(500);
  });
});
