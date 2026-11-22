import { describe, expect, it } from "vitest";
import { parseEmail } from "./email";

describe("parseEmail", () => {
  it("trims and lowercases a valid address", () => {
    expect(parseEmail("  Ann@Example.COM ")).toEqual({
      ok: true,
      email: "ann@example.com",
    });
  });

  it.each([
    ["empty string", ""],
    ["missing domain tld", "a@b"],
    ["no at sign", "not-an-email"],
    ["undefined", undefined],
    ["non-string number", 42],
    ["over 254 characters", "a".repeat(250) + "@x.com"],
  ])("rejects %s", (_label, input) => {
    expect(parseEmail(input)).toEqual({ ok: false });
  });

  it("accepts a 254-character address", () => {
    // 254 total: 64-char local part + "@" + 189-char domain made of 63-char labels.
    const local = "a".repeat(64);
    const domain = `${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(57)}.com`;
    const email = `${local}@${domain}`;
    expect(email.length).toBe(254);
    expect(parseEmail(email)).toEqual({ ok: true, email });
  });
});
