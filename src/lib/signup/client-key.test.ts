import { describe, expect, it } from "vitest";

import { getClientKey } from "./client-key";

const withXff = (value?: string) =>
  new Headers(value === undefined ? {} : { "x-forwarded-for": value });

describe("getClientKey", () => {
  it("uses the first forwarded entry, trimmed", () => {
    const a = getClientKey(withXff("203.0.113.7, 10.0.0.1"));
    expect(getClientKey(withXff(" 203.0.113.7 "))).toBe(a);
    expect(getClientKey(withXff("203.0.113.7"))).toBe(a);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("falls back to a shared key when missing or empty", () => {
    const missing = getClientKey(withXff());
    expect(getClientKey(withXff(""))).toBe(missing);
    expect(missing).not.toBe(getClientKey(withXff("203.0.113.7")));
  });
});
