import { describe, expect, it } from "vitest";

import { searchSettings } from "./search";

const titles = (q: string) => searchSettings(q).map((e) => e.title);

describe("searchSettings", () => {
  it.each(["", "   "])("finds nothing for %j", (q) => {
    expect(searchSettings(q)).toEqual([]);
  });

  it("matches setting names ignoring case and outer spaces", () => {
    expect(titles("  SIGN ")).toEqual(["Sign out", "Sign out of all devices"]);
  });

  it("matches a section name to that section's settings", () => {
    expect(titles("appearance")).toEqual(["Theme"]);
    expect(titles("profile")).toEqual([
      "First name",
      "Last name",
      "Role",
      "Experience",
    ]);
  });

  it("finds the theme by its choices", () => {
    expect(titles("dark")).toEqual(["Theme"]);
  });

  it("finds nothing for an unknown word", () => {
    expect(searchSettings("zzz")).toEqual([]);
  });
});
