import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// Text set in px ignores the reader's default font size; rem follows it and is
// the same at the usual 16px (11px = 0.6875rem).
const DIRS = [
  "src/components/feed",
  "src/app/feed",
  "src/components/settings",
  "src/app/settings",
];
const sources = DIRS.flatMap((dir) =>
  readdirSync(dir)
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\./.test(file))
    .map((file) => path.join(dir, file)),
);

describe("feed text sizes", () => {
  it("finds the feed's sources", () => {
    expect(sources).toContain("src/components/feed/story-card.tsx");
  });

  it.each(sources)("%s sets no text size in px", (file) => {
    const source = readFileSync(file, "utf8");
    expect(source.match(/\btext-\[[\d.]+px\]/g) ?? []).toEqual([]);
  });
});
