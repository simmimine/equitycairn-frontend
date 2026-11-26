import { beforeEach, describe, expect, it, vi } from "vitest";

const getBetaStatus = vi.fn();
const issueVerifyByEmail = vi.fn();
const checkSignupRateLimit = vi.fn();
const getAccountState = vi.fn();
const createPendingAccount = vi.fn();
const signInWithPassword = vi.fn();
const signOutSession = vi.fn();
const checkAttempts = vi.fn();
const sendVerificationEmail = vi.fn();
const sendConfirmEmail = vi.fn();
const headersFn = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const afterCallbacks: (() => unknown)[] = [];

vi.mock("@/lib/signup/store", () => ({
  getBetaStatus: (...a: unknown[]) => getBetaStatus(...a),
  issueVerifyByEmail: (...a: unknown[]) => issueVerifyByEmail(...a),
  checkSignupRateLimit: (...a: unknown[]) => checkSignupRateLimit(...a),
}));
vi.mock("@/lib/auth/accounts", () => ({
  getAccountState: (...a: unknown[]) => getAccountState(...a),
  createPendingAccount: (...a: unknown[]) => createPendingAccount(...a),
  signInWithPassword: (...a: unknown[]) => signInWithPassword(...a),
  signOutSession: (...a: unknown[]) => signOutSession(...a),
}));
vi.mock("@/lib/auth/attempts", () => ({
  checkAttempts: (...a: unknown[]) => checkAttempts(...a),
}));
vi.mock("@/lib/email/verification-email", () => ({
  sendVerificationEmail: (...a: unknown[]) => sendVerificationEmail(...a),
}));
vi.mock("@/lib/email/confirm-email", () => ({
  sendConfirmEmail: (...a: unknown[]) => sendConfirmEmail(...a),
}));
vi.mock("next/server", () => ({
  after: (cb: () => unknown) => {
    afterCallbacks.push(cb);
  },
}));
vi.mock("next/headers", () => ({ headers: () => headersFn() }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u) }));

async function runAfter() {
  for (const cb of afterCallbacks.splice(0)) await cb();
}

import {
  checkEmail,
  createAccount,
  resendBetaVerification,
  signIn,
  signOut,
  signOutEverywhere,
} from "./login";

const EMAIL = "ann@example.com";
const PW = "Zq9!kd2#vL0w";

beforeEach(() => {
  vi.clearAllMocks();
  afterCallbacks.length = 0;
  headersFn.mockResolvedValue(new Headers({ "x-forwarded-for": "1.2.3.4" }));
  checkAttempts.mockResolvedValue({ allowed: true });
  checkSignupRateLimit.mockResolvedValue({ allowed: true });
  getBetaStatus.mockResolvedValue("verified");
  getAccountState.mockResolvedValue("none");
  createPendingAccount.mockResolvedValue({ tokenHash: "th" });
  signInWithPassword.mockResolvedValue("ok");
  sendConfirmEmail.mockResolvedValue(true);
  sendVerificationEmail.mockResolvedValue(true);
});

describe("checkEmail", () => {
  it.each([
    ["not_listed", "none", "not_listed"],
    ["unverified", "none", "unverified"],
    ["verified", "none", "no_account"],
    ["verified", "unconfirmed", "no_account"],
    ["verified", "confirmed", "has_account"],
  ])("beta %s + account %s → %s", async (beta, account, state) => {
    getBetaStatus.mockResolvedValue(beta);
    getAccountState.mockResolvedValue(account);
    expect(await checkEmail(EMAIL)).toEqual({ ok: true, state });
  });

  it("only looks up accounts for verified members", async () => {
    getBetaStatus.mockResolvedValue("not_listed");
    await checkEmail(EMAIL);
    expect(getAccountState).not.toHaveBeenCalled();
  });

  it("normalizes case and whitespace", async () => {
    await checkEmail("  Ann@Example.COM ");
    expect(getBetaStatus).toHaveBeenCalledWith(EMAIL);
  });

  it("rejects an invalid email without lookups", async () => {
    expect(await checkEmail("nope")).toEqual({
      ok: false,
      error: "invalid_email",
    });
    expect(getBetaStatus).not.toHaveBeenCalled();
  });

  it("is rate limited per client", async () => {
    checkAttempts.mockResolvedValue({ allowed: false, retryAfterSeconds: 30 });
    expect(await checkEmail(EMAIL)).toEqual({
      ok: false,
      error: "rate_limited",
      retryAfterSeconds: 30,
    });
    expect(getBetaStatus).not.toHaveBeenCalled();
  });

  it("never sends email", async () => {
    await checkEmail(EMAIL);
    await runAfter();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
    expect(sendConfirmEmail).not.toHaveBeenCalled();
  });
});

describe("resendBetaVerification", () => {
  it("sends the verification email after the response when a token is issued", async () => {
    issueVerifyByEmail.mockResolvedValue({ status: "sent", verifyToken: "vt" });
    expect(await resendBetaVerification(EMAIL)).toEqual({
      ok: true,
      retryAfterSeconds: 60,
    });
    expect(sendVerificationEmail).not.toHaveBeenCalled();
    await runAfter();
    expect(sendVerificationEmail).toHaveBeenCalledWith(EMAIL, "vt");
  });

  it("reports the server-side cooldown", async () => {
    issueVerifyByEmail.mockResolvedValue({
      status: "cooldown",
      retryAfterSeconds: 42,
    });
    expect(await resendBetaVerification(EMAIL)).toEqual({
      ok: false,
      error: "cooldown",
      retryAfterSeconds: 42,
    });
  });
});

describe("createAccount", () => {
  it.each(["not_listed", "unverified"])(
    "refuses a %s email and makes no account",
    async (status) => {
      getBetaStatus.mockResolvedValue(status);
      expect(await createAccount(EMAIL, PW, PW)).toEqual({
        ok: false,
        error: "not_member",
      });
      expect(createPendingAccount).not.toHaveBeenCalled();
      await runAfter();
      expect(sendConfirmEmail).not.toHaveBeenCalled();
    },
  );

  it("surfaces password errors and creates nothing", async () => {
    expect(await createAccount(EMAIL, "short", "short")).toEqual({
      ok: false,
      error: "password",
      passwordError: "too_short",
    });
    expect(createPendingAccount).not.toHaveBeenCalled();
  });

  it("creates a pending account and emails the confirm link after the response", async () => {
    expect(await createAccount(EMAIL, PW, PW)).toEqual({
      ok: true,
      retryAfterSeconds: 60,
    });
    expect(createPendingAccount).toHaveBeenCalledWith(EMAIL, PW);
    expect(sendConfirmEmail).not.toHaveBeenCalled();
    await runAfter();
    expect(sendConfirmEmail).toHaveBeenCalledWith(EMAIL, "th");
  });

  it("enforces a per-address cooldown", async () => {
    checkSignupRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 30,
    });
    expect(await createAccount(EMAIL, PW, PW)).toEqual({
      ok: false,
      error: "cooldown",
      retryAfterSeconds: 30,
    });
    expect(createPendingAccount).not.toHaveBeenCalled();
  });

  it("reports an existing confirmed account", async () => {
    createPendingAccount.mockResolvedValue({ error: "exists_confirmed" });
    expect(await createAccount(EMAIL, PW, PW)).toEqual({
      ok: false,
      error: "has_account",
    });
    await runAfter();
    expect(sendConfirmEmail).not.toHaveBeenCalled();
  });
});

describe("signIn", () => {
  it("redirects to /feed on success", async () => {
    await expect(signIn(EMAIL, PW)).rejects.toThrow("NEXT_REDIRECT:/feed");
  });

  it("returns a generic error for bad credentials", async () => {
    signInWithPassword.mockResolvedValue("invalid");
    expect(await signIn(EMAIL, PW)).toEqual({
      ok: false,
      error: "invalid_credentials",
    });
  });

  it("tells a correct-password user their account is unconfirmed", async () => {
    signInWithPassword.mockResolvedValue("unconfirmed");
    expect(await signIn(EMAIL, PW)).toEqual({
      ok: false,
      error: "unconfirmed",
    });
  });

  it("is rate limited before touching Supabase", async () => {
    checkAttempts.mockResolvedValue({ allowed: false, retryAfterSeconds: 99 });
    expect(await signIn(EMAIL, PW)).toEqual({
      ok: false,
      error: "rate_limited",
      retryAfterSeconds: 99,
    });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});

describe("signOut", () => {
  it("ends only this device's session and redirects home", async () => {
    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(signOutSession).toHaveBeenCalledWith("local");
  });

  it("can end every session", async () => {
    await expect(signOutEverywhere()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(signOutSession).toHaveBeenCalledWith("global");
  });
});

describe("logging", () => {
  it("never logs the email or password on failure", async () => {
    const spies = (["log", "warn", "error", "info"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    getBetaStatus.mockRejectedValue(new Error("db down"));
    await checkEmail(EMAIL);
    createPendingAccount.mockRejectedValue(new Error("boom"));
    getBetaStatus.mockResolvedValue("verified");
    await createAccount(EMAIL, PW, PW);
    const out = spies
      .flatMap((s) => s.mock.calls)
      .flat()
      .join(" ");
    expect(out).not.toContain(EMAIL);
    expect(out).not.toContain(PW);
    spies.forEach((s) => s.mockRestore());
  });
});
