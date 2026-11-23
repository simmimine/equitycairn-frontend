import { beforeEach, describe, expect, it, vi } from "vitest";

const checkSignupRateLimit = vi.fn();
const registerSignup = vi.fn();
const sendVerificationEmail = vi.fn();
const headersFn = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock("@/lib/signup/store", () => ({
  checkSignupRateLimit: (...a: unknown[]) => checkSignupRateLimit(...a),
  registerSignup: (...a: unknown[]) => registerSignup(...a),
}));
vi.mock("@/lib/email/verification-email", () => ({
  sendVerificationEmail: (...a: unknown[]) => sendVerificationEmail(...a),
}));
vi.mock("next/headers", () => ({ headers: () => headersFn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

import { HONEYPOT_FIELD } from "@/lib/signup/honeypot";

import { joinBeta } from "./join-beta";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

function captureConsole() {
  return (["log", "warn", "error", "info", "debug"] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation(() => {}),
  );
}

describe("joinBeta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersFn.mockResolvedValue(new Headers({ "x-forwarded-for": "1.2.3.4" }));
    checkSignupRateLimit.mockResolvedValue({ allowed: true });
    registerSignup.mockResolvedValue({
      manageToken: "manage-raw",
      verifyToken: "verify-raw",
    });
    sendVerificationEmail.mockResolvedValue(true);
  });

  it("silently succeeds on honeypot without touching headers or store", async () => {
    const result = await joinBeta(
      null,
      form({ email: "ann@example.com", [HONEYPOT_FIELD]: "http://spam" }),
    );
    expect(result).toEqual({ ok: true });
    expect(headersFn).not.toHaveBeenCalled();
    expect(checkSignupRateLimit).not.toHaveBeenCalled();
    expect(registerSignup).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("rejects an invalid email without store calls", async () => {
    const result = await joinBeta(null, form({ email: "nope" }));
    expect(result).toEqual({ ok: false, error: "invalid_email" });
    expect(checkSignupRateLimit).not.toHaveBeenCalled();
    expect(registerSignup).not.toHaveBeenCalled();
  });

  it("returns rate_limited and does not register", async () => {
    checkSignupRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 42,
    });
    const result = await joinBeta(null, form({ email: "ann@example.com" }));
    expect(result).toEqual({
      ok: false,
      error: "rate_limited",
      retryAfterSeconds: 42,
    });
    expect(registerSignup).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("registers, emails the raw verify token, then redirects", async () => {
    await expect(
      joinBeta(null, form({ email: " Ann@Example.com " })),
    ).rejects.toThrow("NEXT_REDIRECT:/join-beta?token=manage-raw");
    expect(registerSignup).toHaveBeenCalledWith("ann@example.com");
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      "ann@example.com",
      "verify-raw",
    );
    expect(redirect).toHaveBeenCalledWith("/join-beta?token=manage-raw");
  });

  it("passes a hashed client key to the rate limiter", async () => {
    await expect(
      joinBeta(null, form({ email: "ann@example.com" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    const key = checkSignupRateLimit.mock.calls[0][0] as string;
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it("URL-encodes the manage token in the redirect", async () => {
    registerSignup.mockResolvedValue({
      manageToken: "a b/c+d&e=f",
      verifyToken: "v",
    });
    await expect(
      joinBeta(null, form({ email: "ann@example.com" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(
      `/join-beta?token=${encodeURIComponent("a b/c+d&e=f")}`,
    );
  });

  it("verified and new addresses produce the same redirect shape; null verify token sends no email", async () => {
    registerSignup.mockResolvedValue({
      manageToken: "manage-existing",
      verifyToken: null,
    });
    await expect(
      joinBeta(null, form({ email: "ann@example.com" })),
    ).rejects.toThrow("NEXT_REDIRECT:/join-beta?token=manage-existing");
    expect(sendVerificationEmail).not.toHaveBeenCalled();

    registerSignup.mockResolvedValue({
      manageToken: "manage-new",
      verifyToken: "v",
    });
    await expect(
      joinBeta(null, form({ email: "new@example.com" })),
    ).rejects.toThrow("NEXT_REDIRECT:/join-beta?token=manage-new");
    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
    // Neither path returns a distinguishing visible result (both redirect).
    expect(redirect).toHaveBeenCalledTimes(2);
  });

  it("still redirects when the email send returns false", async () => {
    sendVerificationEmail.mockResolvedValue(false);
    await expect(
      joinBeta(null, form({ email: "ann@example.com" })),
    ).rejects.toThrow("NEXT_REDIRECT:/join-beta?token=manage-raw");
  });

  it("still redirects when the email send throws, without logging secrets", async () => {
    const spies = captureConsole();
    sendVerificationEmail.mockRejectedValue(new Error("smtp down"));
    await expect(
      joinBeta(null, form({ email: "ann@example.com" })),
    ).rejects.toThrow("NEXT_REDIRECT:/join-beta?token=manage-raw");
    for (const spy of spies) {
      const logged = JSON.stringify(spy.mock.calls);
      expect(logged).not.toContain("ann@example.com");
      expect(logged).not.toContain("verify-raw");
      expect(logged).not.toContain("manage-raw");
      spy.mockRestore();
    }
  });

  it("returns server_error when registerSignup throws, logging nothing sensitive", async () => {
    const spies = captureConsole();
    registerSignup.mockRejectedValue(new Error("signup store: insert: boom"));
    const result = await joinBeta(null, form({ email: "ann@example.com" }));
    expect(result).toEqual({ ok: false, error: "server_error" });
    expect(redirect).not.toHaveBeenCalled();
    const logged = spies.map((s) => JSON.stringify(s.mock.calls)).join("");
    expect(logged).toContain("signup store: insert: boom");
    expect(logged).not.toContain("ann@example.com");
    expect(logged).not.toContain("verify-raw");
    expect(logged).not.toContain("manage-raw");
    spies.forEach((s) => s.mockRestore());
  });

  it("returns server_error when the rate limit check throws", async () => {
    const spies = captureConsole();
    checkSignupRateLimit.mockRejectedValue(new Error("rpc failed"));
    const result = await joinBeta(null, form({ email: "ann@example.com" }));
    expect(result).toEqual({ ok: false, error: "server_error" });
    expect(registerSignup).not.toHaveBeenCalled();
    const logged = spies.map((s) => JSON.stringify(s.mock.calls)).join("");
    expect(logged).not.toContain("ann@example.com");
    spies.forEach((s) => s.mockRestore());
  });

  it("returns server_error when headers() throws", async () => {
    captureConsole();
    headersFn.mockRejectedValue(new Error("no request scope"));
    expect(await joinBeta(null, form({ email: "ann@example.com" }))).toEqual({
      ok: false,
      error: "server_error",
    });
  });
});
