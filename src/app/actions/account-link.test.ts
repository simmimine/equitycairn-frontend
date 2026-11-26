import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const signOutSession = vi.fn();
const checkAttempts = vi.fn();
const issueLink = vi.fn();
const consumeLink = vi.fn();
const setPassword = vi.fn();
const deleteAccount = vi.fn();
const sendAccountLinkEmail = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "1.2.3.4" }),
}));
vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/auth/accounts", () => ({
  signOutSession: (...a: unknown[]) => signOutSession(...a),
}));
vi.mock("@/lib/auth/attempts", () => ({
  checkAttempts: (...a: unknown[]) => checkAttempts(...a),
}));
vi.mock("@/lib/account/links", () => ({
  issueLink: (...a: unknown[]) => issueLink(...a),
  consumeLink: (...a: unknown[]) => consumeLink(...a),
}));
vi.mock("@/lib/account/admin", () => ({
  setPassword: (...a: unknown[]) => setPassword(...a),
  deleteAccount: (...a: unknown[]) => deleteAccount(...a),
}));
vi.mock("@/lib/email/account-link-email", () => ({
  sendAccountLinkEmail: (...a: unknown[]) => sendAccountLinkEmail(...a),
}));

import {
  confirmAccountDeletion,
  confirmPasswordChange,
  requestAccountLink,
} from "./account-link";

const USER = { id: "u1", email: "ann@example.com" };
const PW = "Zq9!kd2#vL0w";
const TOKEN = "t".repeat(43);

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue(USER);
  checkAttempts.mockResolvedValue({ allowed: true });
  issueLink.mockResolvedValue(TOKEN);
  consumeLink.mockResolvedValue({ userId: "u1" });
  sendAccountLinkEmail.mockResolvedValue(true);
  signOutSession.mockResolvedValue(undefined);
});

afterEach(() => vi.restoreAllMocks());

describe("requestAccountLink", () => {
  it("emails a link to the session's own address", async () => {
    expect(await requestAccountLink("password_change")).toEqual({
      ok: true,
      email: USER.email,
    });
    expect(checkAttempts).toHaveBeenCalledWith("account-link", "u1", {
      max: 3,
      windowSeconds: 600,
    });
    expect(issueLink).toHaveBeenCalledWith("u1", "password_change");
    expect(sendAccountLinkEmail).toHaveBeenCalledWith(
      USER.email,
      "password_change",
      TOKEN,
    );
  });

  it("needs a session", async () => {
    getUser.mockResolvedValue(null);
    expect(await requestAccountLink("account_delete")).toEqual({
      ok: false,
      error: "unauthenticated",
    });
    expect(issueLink).not.toHaveBeenCalled();
  });

  it("rejects an unknown purpose", async () => {
    expect(await requestAccountLink("other" as never)).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(issueLink).not.toHaveBeenCalled();
  });

  it("is rate limited", async () => {
    checkAttempts.mockResolvedValue({ allowed: false, retryAfterSeconds: 9 });
    expect(await requestAccountLink("account_delete")).toEqual({
      ok: false,
      error: "rate_limited",
      retryAfterSeconds: 9,
    });
    expect(issueLink).not.toHaveBeenCalled();
  });

  it("says when the email could not be sent", async () => {
    sendAccountLinkEmail.mockResolvedValue(false);
    expect(await requestAccountLink("account_delete")).toEqual({
      ok: false,
      error: "send_failed",
    });
  });

  it("hides failures and logs no address or token", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    sendAccountLinkEmail.mockRejectedValue(new Error("boom"));
    expect(await requestAccountLink("account_delete")).toEqual({
      ok: false,
      error: "server_error",
    });
    const out = log.mock.calls.flat().join(" ");
    expect(out).not.toContain(USER.email);
    expect(out).not.toContain(TOKEN);
  });
});

describe("confirmPasswordChange", () => {
  it("consumes the link and sets the password", async () => {
    expect(await confirmPasswordChange(TOKEN, PW, PW)).toEqual({ ok: true });
    expect(checkAttempts).toHaveBeenCalledWith(
      "account-confirm",
      expect.any(String),
      { max: 10, windowSeconds: 600 },
    );
    expect(consumeLink).toHaveBeenCalledWith(TOKEN, "password_change");
    expect(setPassword).toHaveBeenCalledWith("u1", PW);
  });

  it.each([
    ["short", "short", "too_short"],
    [PW, `${PW}x`, "mismatch"],
  ])("does not use up the link for %s / %s", async (pw, confirm, error) => {
    expect(await confirmPasswordChange(TOKEN, pw, confirm)).toEqual({
      ok: false,
      error: "password",
      passwordError: error,
    });
    expect(consumeLink).not.toHaveBeenCalled();
  });

  it("does nothing for a used or expired link", async () => {
    consumeLink.mockResolvedValue(null);
    expect(await confirmPasswordChange(TOKEN, PW, PW)).toEqual({
      ok: false,
      error: "expired",
    });
    expect(setPassword).not.toHaveBeenCalled();
  });

  it("treats a non-string token as expired", async () => {
    expect(await confirmPasswordChange(undefined as never, PW, PW)).toEqual({
      ok: false,
      error: "expired",
    });
    expect(consumeLink).not.toHaveBeenCalled();
  });

  it("works signed out", async () => {
    getUser.mockResolvedValue(null);
    expect(await confirmPasswordChange(TOKEN, PW, PW)).toEqual({ ok: true });
    expect(signOutSession).not.toHaveBeenCalled();
  });

  it("clears this browser's session when it is the same user", async () => {
    await confirmPasswordChange(TOKEN, PW, PW);
    expect(signOutSession).toHaveBeenCalledWith("local");
  });

  it("leaves another signed-in user alone", async () => {
    getUser.mockResolvedValue({ id: "someone-else" });
    expect(await confirmPasswordChange(TOKEN, PW, PW)).toEqual({ ok: true });
    expect(signOutSession).not.toHaveBeenCalled();
  });

  it("still succeeds when clearing the session fails", async () => {
    signOutSession.mockRejectedValue(new Error("gone"));
    expect(await confirmPasswordChange(TOKEN, PW, PW)).toEqual({ ok: true });
  });

  it("reports a failed change", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    setPassword.mockRejectedValue(new Error("boom"));
    expect(await confirmPasswordChange(TOKEN, PW, PW)).toEqual({
      ok: false,
      error: "server_error",
    });
  });
});

describe("confirmAccountDeletion", () => {
  it("consumes a delete link and deletes", async () => {
    expect(await confirmAccountDeletion(TOKEN)).toEqual({ ok: true });
    expect(consumeLink).toHaveBeenCalledWith(TOKEN, "account_delete");
    expect(deleteAccount).toHaveBeenCalledWith("u1");
    expect(signOutSession).toHaveBeenCalledWith("local");
  });

  it("is rate limited before touching the link", async () => {
    checkAttempts.mockResolvedValue({ allowed: false, retryAfterSeconds: 5 });
    expect(await confirmAccountDeletion(TOKEN)).toEqual({
      ok: false,
      error: "rate_limited",
      retryAfterSeconds: 5,
    });
    expect(consumeLink).not.toHaveBeenCalled();
    expect(deleteAccount).not.toHaveBeenCalled();
  });
});
