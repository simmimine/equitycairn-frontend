import { describe, expect, it } from "vitest";

import { generateToken, hashToken } from "./tokens";

describe("tokens", () => {
  it("generates distinct tokens", () => {
    expect(generateToken().raw).not.toBe(generateToken().raw);
  });

  it("produces a 43-char base64url raw token and a 64-char hex hash", () => {
    const { raw, hash } = generateToken();
    expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashToken(raw));
  });

  it("hashes deterministically", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });
});
