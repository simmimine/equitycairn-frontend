import { beforeEach, describe, expect, it, vi } from "vitest";

const passwordMatchesPending = vi.fn();
const confirmWithToken = vi.fn();
const checkAttempts = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock("@/lib/auth/accounts", () => ({
  passwordMatchesPending: (...a: unknown[]) => passwordMatchesPending(...a),
  confirmWithToken: (...a: unknown[]) => confirmWithToken(...a),
}));
vi.mock("@/lib/auth/attempts", () => ({
  checkAttempts: (...a: unknown[]) => checkAttempts(...a),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "1.2.3.4" }),
}));
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u) }));

import { confirmAccount } from "./confirm-account";

beforeEach(() => {
  vi.clearAllMocks();
  checkAttempts.mockResolvedValue({ allowed: true });
  passwordMatchesPending.mockResolvedValue(true);
  confirmWithToken.mockResolvedValue(true);
});

describe("confirmAccount", () => {
  it("never confirms when the password is wrong", async () => {
    passwordMatchesPending.mockResolvedValue(false);
    expect(await confirmAccount("th", "a@example.com", "bad")).toEqual({
      ok: false,
      error: "wrong_password",
    });
    expect(confirmWithToken).not.toHaveBeenCalled();
  });

  it("confirms and redirects to onboarding with the right password and token", async () => {
    await expect(confirmAccount("th", "A@Example.com", "pw")).rejects.toThrow(
      "NEXT_REDIRECT:/onboarding",
    );
    expect(passwordMatchesPending).toHaveBeenCalledWith("a@example.com", "pw");
    expect(confirmWithToken).toHaveBeenCalledWith("th");
  });

  it("reports an expired or used token", async () => {
    confirmWithToken.mockResolvedValue(false);
    expect(await confirmAccount("th", "a@example.com", "pw")).toEqual({
      ok: false,
      error: "expired",
    });
  });

  it("is rate limited before checking the password", async () => {
    checkAttempts.mockResolvedValue({ allowed: false, retryAfterSeconds: 60 });
    expect(await confirmAccount("th", "a@example.com", "pw")).toEqual({
      ok: false,
      error: "rate_limited",
      retryAfterSeconds: 60,
    });
    expect(passwordMatchesPending).not.toHaveBeenCalled();
  });

  it("rejects malformed input without calling Supabase", async () => {
    expect(await confirmAccount("", "a@example.com", "pw")).toMatchObject({
      ok: false,
      error: "expired",
    });
    expect(passwordMatchesPending).not.toHaveBeenCalled();
  });
});
