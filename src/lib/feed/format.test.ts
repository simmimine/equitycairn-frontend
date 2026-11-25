import { afterEach, describe, expect, it } from "vitest";

import { companyName, coverageLabel, formatPublished } from "./format";
import type { Story } from "./types";

const story: Story = {
  id: "AAPL-1",
  ticker: "AAPL",
  headline: "Example",
  publisher: "Example Wire",
  kind: "news",
  publishedAt: "2026-11-24T09:42:00.000Z",
  linkCount: 1,
  originalUrl: "https://example.com/a",
  isNew: false,
};

describe("formatPublished", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it("formats in UTC", () => {
    expect(formatPublished("2026-11-24T09:42:00.000Z")).toBe(
      "24 Nov · 09:42 UTC",
    );
    expect(formatPublished("2026-01-05T00:07:59.000Z")).toBe(
      "5 Jan · 00:07 UTC",
    );
  });

  it("ignores the machine timezone", () => {
    process.env.TZ = "Pacific/Kiritimati";
    // Guard: the change must really move local time, or this proves nothing.
    expect(new Date("2026-11-24T23:30:00.000Z").getDate()).toBe(25);
    expect(formatPublished("2026-11-24T23:30:00.000Z")).toBe(
      "24 Nov · 23:30 UTC",
    );
  });
});

describe("coverageLabel", () => {
  it("names a filing whatever its link count", () => {
    expect(coverageLabel({ ...story, kind: "filing", linkCount: 4 })).toBe(
      "Filed document · original link",
    );
  });

  it("counts one link or a group", () => {
    expect(coverageLabel(story)).toBe("1 sample link");
    expect(coverageLabel({ ...story, linkCount: 3 })).toBe(
      "3 sample links grouped",
    );
  });
});

describe("companyName", () => {
  it.each([
    ["AAPL", "Apple Inc."],
    ["NVDA", "NVIDIA"],
    ["MSFT", "Microsoft"],
    ["MA", "Mastercard"],
    ["V", "Visa Inc."],
    ["KO", "Coca-Cola Company"],
  ])("names %s", (ticker, name) => {
    expect(companyName(ticker)).toBe(name);
  });

  it.each(["ZZZZ", "BRK.B"])("returns null for %s", (ticker) => {
    expect(companyName(ticker)).toBeNull();
  });
});
