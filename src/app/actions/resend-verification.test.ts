import { beforeEach, describe, expect, it, vi } from "vitest";

const issueResend = vi.fn();
const checkSignupRateLimit = vi.fn();
const sendVerificationEmail = vi.fn();
const headersFn = vi.fn();
const afterCallbacks: (() => unknown)[] = [];

vi.mock("@/lib/signup/store", () => ({
  issueResend: (...a: unknown[]) => issueResend(...a),
  checkSignupRateLimit: (...a: unknown[]) => checkSignupRateLimit(...a),
}));
vi.mock("@/lib/email/verification-email", () => ({
  sendVerificationEmail: (...a: unknown[]) => sendVerificationEmail(...a),
}));
vi.mock("next/headers", () => ({ headers: () => headersFn() }));
vi.mock("next/server", () => ({
  after: (cb: () => unknown) => {
    afterCallbacks.push(cb);
  },
}));

import { getClientKey } from "@/lib/signup/client-key";

import { resendVerification } from "./resend-verification";

const TOKEN = "M".repeat(43);
const sent = {
  status: "sent",
  verifyToken: "v-raw",
  email: "ann@example.com",
};

async function runAfter() {
  for (const cb of afterCallbacks.splice(0)) await cb();
}

function captureConsole() {
  return (["log", "warn", "error", "info", "debug"] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation(() => {}),
  );
}

describe("resendVerification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;
    headersFn.mockResolvedValue(new Headers({ "x-forwarded-for": "1.2.3.4" }));
    checkSignupRateLimit.mockResolvedValue({ allowed: true });
    sendVerificationEmail.mockResolvedValue(true);
  });

  it("sends the email only after the response, and returns the cooldown", async () => {
    issueResend.mockResolvedValue(sent);
    expect(await resendVerification(TOKEN)).toEqual({
      ok: true,
      retryAfterSeconds: 60,
    });
    expect(issueResend).toHaveBeenCalledWith(TOKEN);
    expect(sendVerificationEmail).not.toHaveBeenCalled();
    await runAfter();
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      "ann@example.com",
      "v-raw",
    );
  });

  it("returns the identical result on `noop` and schedules no email", async () => {
    issueResend.mockResolvedValue({ status: "noop" });
    expect(await resendVerification(TOKEN)).toEqual({
      ok: true,
      retryAfterSeconds: 60,
    });
    expect(afterCallbacks).toHaveLength(0);
    await runAfter();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("returns cooldown with the remaining seconds", async () => {
    issueResend.mockResolvedValue({
      status: "cooldown",
      retryAfterSeconds: 17,
    });
    expect(await resendVerification(TOKEN)).toEqual({
      ok: false,
      error: "cooldown",
      retryAfterSeconds: 17,
    });
    expect(afterCallbacks).toHaveLength(0);
  });

  it("maps `invalid` to invalid_token", async () => {
    issueResend.mockResolvedValue({ status: "invalid" });
    expect(await resendVerification(TOKEN)).toEqual({
      ok: false,
      error: "invalid_token",
    });
  });

  it.each([
    ["empty", ""],
    ["number", 123],
    ["null", null],
    ["undefined", undefined],
    ["object", {}],
    ["array", [TOKEN]],
    ["over-long", "M".repeat(129)],
    ["malformed", "junk"],
  ])(
    "rejects a %s token without touching headers, rate limit or store",
    async (_n, bad) => {
      expect(await resendVerification(bad as string)).toEqual({
        ok: false,
        error: "invalid_token",
      });
      expect(headersFn).not.toHaveBeenCalled();
      expect(checkSignupRateLimit).not.toHaveBeenCalled();
      expect(issueResend).not.toHaveBeenCalled();
    },
  );

  it("returns cooldown and skips the store when the IP is rate limited", async () => {
    checkSignupRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 33,
    });
    expect(await resendVerification(TOKEN)).toEqual({
      ok: false,
      error: "cooldown",
      retryAfterSeconds: 33,
    });
    expect(issueResend).not.toHaveBeenCalled();
    expect(afterCallbacks).toHaveLength(0);
  });

  it("uses a resend:-prefixed key distinct from the sign-up key", async () => {
    issueResend.mockResolvedValue({ status: "noop" });
    await resendVerification(TOKEN);
    const key = checkSignupRateLimit.mock.calls[0][0] as string;
    const signupKey = getClientKey(
      new Headers({ "x-forwarded-for": "1.2.3.4" }),
    );
    expect(key).toBe(`resend:${signupKey}`);
    expect(key).not.toBe(signupKey);
  });

  it("returns server_error when the rate limit check throws", async () => {
    captureConsole();
    checkSignupRateLimit.mockRejectedValue(new Error("rpc failed"));
    expect(await resendVerification(TOKEN)).toEqual({
      ok: false,
      error: "server_error",
    });
    expect(issueResend).not.toHaveBeenCalled();
  });

  it("swallows a send that returns false or throws inside the callback", async () => {
    const spies = captureConsole();
    issueResend.mockResolvedValue(sent);
    sendVerificationEmail.mockResolvedValueOnce(false);
    expect(await resendVerification(TOKEN)).toEqual({
      ok: true,
      retryAfterSeconds: 60,
    });
    await expect(runAfter()).resolves.toBeUndefined();

    sendVerificationEmail.mockRejectedValueOnce(new Error("down"));
    expect(await resendVerification(TOKEN)).toEqual({
      ok: true,
      retryAfterSeconds: 60,
    });
    await expect(runAfter()).resolves.toBeUndefined();
    expect(sendVerificationEmail).toHaveBeenCalledTimes(2);
    const logged = spies.map((s) => JSON.stringify(s.mock.calls)).join("");
    expect(logged).not.toContain("ann@example.com");
    expect(logged).not.toContain("v-raw");
    spies.forEach((s) => s.mockRestore());
  });

  it("returns server_error when the store throws, logging nothing sensitive", async () => {
    const spies = captureConsole();
    issueResend.mockRejectedValue(new Error("signup store: boom"));
    expect(await resendVerification(TOKEN)).toEqual({
      ok: false,
      error: "server_error",
    });
    const logged = spies.map((s) => JSON.stringify(s.mock.calls)).join("");
    expect(logged).toContain("signup store: boom");
    expect(logged).not.toContain(TOKEN);
    spies.forEach((s) => s.mockRestore());
  });
});
