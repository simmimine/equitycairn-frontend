import { describe, expect, it } from "vitest";

import { validatePassword } from "./password";

const ok = (n: number) => "a1".repeat(n / 2).padEnd(n, "x");

describe("validatePassword", () => {
  it("rejects 11 characters", () => {
    expect(validatePassword(ok(11), ok(11))).toEqual({
      ok: false,
      error: "too_short",
    });
  });
  it("accepts 12 characters", () => {
    expect(validatePassword("Zq9!kd2#vL0w", "Zq9!kd2#vL0w")).toEqual({
      ok: true,
      password: "Zq9!kd2#vL0w",
    });
  });
  it("accepts 72 bytes", () => {
    const p = "Zq9!".repeat(18);
    expect(validatePassword(p, p).ok).toBe(true);
  });
  it("rejects 73 bytes", () => {
    const p = "Zq9!".repeat(18) + "x";
    expect(validatePassword(p, p)).toEqual({ ok: false, error: "too_long" });
  });
  it("measures the maximum in bytes, not characters", () => {
    const p = "é".repeat(40); // 40 chars, 80 bytes
    expect(validatePassword(p, p)).toEqual({ ok: false, error: "too_long" });
  });
  it("rejects a mismatched confirmation", () => {
    expect(validatePassword("Zq9!kd2#vL0w", "Zq9!kd2#vL0W")).toEqual({
      ok: false,
      error: "mismatch",
    });
  });
  it("rejects common passwords, case-insensitively", () => {
    expect(validatePassword("Password1234", "Password1234")).toEqual({
      ok: false,
      error: "common",
    });
  });
  it("rejects non-strings", () => {
    expect(validatePassword(undefined, undefined)).toEqual({
      ok: false,
      error: "invalid",
    });
  });
});
