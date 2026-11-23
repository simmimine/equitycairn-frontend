import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getClientKey } from "./client-key";

const withXff = (value?: string) =>
  new Headers(value === undefined ? {} : { "x-forwarded-for": value });

let saved: string | undefined;
beforeEach(() => {
  saved = process.env.TRUSTED_PROXY_HOPS;
  delete process.env.TRUSTED_PROXY_HOPS;
});
afterEach(() => {
  if (saved === undefined) delete process.env.TRUSTED_PROXY_HOPS;
  else process.env.TRUSTED_PROXY_HOPS = saved;
});

describe("getClientKey", () => {
  it("uses the last entry by default, trimmed", () => {
    const a = getClientKey(withXff("1.2.3.4, 203.0.113.7"));
    expect(getClientKey(withXff(" 203.0.113.7 "))).toBe(a);
    expect(getClientKey(withXff("203.0.113.7"))).toBe(a);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ignores a client-supplied prefix (spoof resistance)", () => {
    expect(getClientKey(withXff("1.2.3.4, 203.0.113.7"))).toBe(
      getClientKey(withXff("9.9.9.9, 203.0.113.7")),
    );
  });

  it("counts from the right with TRUSTED_PROXY_HOPS", () => {
    process.env.TRUSTED_PROXY_HOPS = "2";
    expect(getClientKey(withXff("9.9.9.9, 203.0.113.7, 10.0.0.1"))).toBe(
      getClientKey(withXff("203.0.113.7")),
    );
  });

  it("uses the leftmost entry when hops exceed the entry count", () => {
    process.env.TRUSTED_PROXY_HOPS = "5";
    expect(getClientKey(withXff("203.0.113.7, 10.0.0.1"))).toBe(
      getClientKey(withXff("203.0.113.7")),
    );
  });

  it.each(["", "  ", "0", "-1", "abc", "1.5"])(
    "treats invalid hops %j as 1",
    (v) => {
      process.env.TRUSTED_PROXY_HOPS = v;
      expect(getClientKey(withXff("9.9.9.9, 203.0.113.7"))).toBe(
        getClientKey(withXff("203.0.113.7")),
      );
    },
  );

  it("falls back to a shared key when missing, empty or separator-only", () => {
    const missing = getClientKey(withXff());
    expect(getClientKey(withXff(""))).toBe(missing);
    expect(getClientKey(withXff(" , "))).toBe(missing);
    expect(getClientKey(withXff("  "))).toBe(missing);
    expect(missing).not.toBe(getClientKey(withXff("203.0.113.7")));
  });
});
