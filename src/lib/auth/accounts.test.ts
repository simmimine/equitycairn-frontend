import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const generateLink = vi.fn();
const deleteUser = vi.fn();
const signInWithPassword = vi.fn();
const verifyOtp = vi.fn();
const sessionSignIn = vi.fn();
const sessionSignOut = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({
    rpc,
    auth: { admin: { generateLink, deleteUser } },
  }),
  getSupabaseAnon: () => ({ auth: { signInWithPassword } }),
}));
vi.mock("./session", () => ({
  createSessionClient: async () => ({
    auth: {
      verifyOtp,
      signInWithPassword: sessionSignIn,
      signOut: sessionSignOut,
    },
  }),
}));

import {
  confirmWithToken,
  createPendingAccount,
  getAccountState,
  passwordMatchesPending,
  signInWithPassword as signInSession,
  signOutSession,
} from "./accounts";

beforeEach(() => {
  for (const m of [
    rpc,
    generateLink,
    deleteUser,
    signInWithPassword,
    verifyOtp,
  ])
    m.mockReset();
  deleteUser.mockResolvedValue({ error: null });
});

describe("getAccountState", () => {
  it("maps no rows to none", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    expect(await getAccountState("a@example.com")).toBe("none");
    expect(rpc).toHaveBeenCalledWith("auth_user_state", {
      p_email: "a@example.com",
    });
  });
  it("maps confirmed and unconfirmed rows", async () => {
    rpc.mockResolvedValue({
      data: [{ id: "u1", confirmed: true }],
      error: null,
    });
    expect(await getAccountState("a@example.com")).toBe("confirmed");
    rpc.mockResolvedValue({
      data: [{ id: "u1", confirmed: false }],
      error: null,
    });
    expect(await getAccountState("a@example.com")).toBe("unconfirmed");
  });
  it("throws on an rpc error", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(getAccountState("a@example.com")).rejects.toThrow();
  });
});

describe("createPendingAccount", () => {
  it("creates the user and returns the token hash", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    generateLink.mockResolvedValue({
      data: { properties: { hashed_token: "hash123" } },
      error: null,
    });
    expect(
      await createPendingAccount("a@example.com", "pw-pw-pw-pw-1"),
    ).toEqual({
      tokenHash: "hash123",
    });
    expect(generateLink).toHaveBeenCalledWith({
      type: "signup",
      email: "a@example.com",
      password: "pw-pw-pw-pw-1",
    });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("deletes an unconfirmed user before recreating it", async () => {
    rpc.mockResolvedValue({
      data: [{ id: "u1", confirmed: false }],
      error: null,
    });
    generateLink.mockResolvedValue({
      data: { properties: { hashed_token: "h2" } },
      error: null,
    });
    await createPendingAccount("a@example.com", "pw-pw-pw-pw-1");
    expect(deleteUser).toHaveBeenCalledWith("u1");
    expect(deleteUser.mock.invocationCallOrder[0]).toBeLessThan(
      generateLink.mock.invocationCallOrder[0],
    );
  });

  it("refuses to touch a confirmed account", async () => {
    rpc.mockResolvedValue({
      data: [{ id: "u1", confirmed: true }],
      error: null,
    });
    expect(
      await createPendingAccount("a@example.com", "pw-pw-pw-pw-1"),
    ).toEqual({
      error: "exists_confirmed",
    });
    expect(deleteUser).not.toHaveBeenCalled();
    expect(generateLink).not.toHaveBeenCalled();
  });

  it("reports failure when link generation fails", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    generateLink.mockResolvedValue({ data: null, error: { message: "x" } });
    expect(
      await createPendingAccount("a@example.com", "pw-pw-pw-pw-1"),
    ).toEqual({
      error: "failed",
    });
  });
});

describe("passwordMatchesPending", () => {
  it("is true only when Supabase reports the email is not confirmed", async () => {
    signInWithPassword.mockResolvedValue({
      data: {},
      error: { code: "email_not_confirmed" },
    });
    expect(await passwordMatchesPending("a@example.com", "pw")).toBe(true);
  });
  it("is false for wrong credentials", async () => {
    signInWithPassword.mockResolvedValue({
      data: {},
      error: { code: "invalid_credentials" },
    });
    expect(await passwordMatchesPending("a@example.com", "pw")).toBe(false);
  });
  it("is false when sign-in unexpectedly succeeds", async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: {} },
      error: null,
    });
    expect(await passwordMatchesPending("a@example.com", "pw")).toBe(false);
  });
});

describe("confirmWithToken", () => {
  it("verifies a signup token through the session client", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: null });
    expect(await confirmWithToken("h")).toBe(true);
    expect(verifyOtp).toHaveBeenCalledWith({ type: "signup", token_hash: "h" });
  });
  it("returns false for a bad token", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: { message: "expired" } });
    expect(await confirmWithToken("h")).toBe(false);
  });
});

describe("signInWithPassword", () => {
  it("maps success, wrong password and unconfirmed", async () => {
    sessionSignIn.mockResolvedValue({ data: {}, error: null });
    expect(await signInSession("a@example.com", "pw")).toBe("ok");
    sessionSignIn.mockResolvedValue({
      data: {},
      error: { code: "invalid_credentials" },
    });
    expect(await signInSession("a@example.com", "pw")).toBe("invalid");
    sessionSignIn.mockResolvedValue({
      data: {},
      error: { code: "email_not_confirmed" },
    });
    expect(await signInSession("a@example.com", "pw")).toBe("unconfirmed");
  });
  it("throws on unexpected errors", async () => {
    sessionSignIn.mockResolvedValue({
      data: {},
      error: { code: "unexpected_failure", status: 500 },
    });
    await expect(signInSession("a@example.com", "pw")).rejects.toThrow();
  });
});

describe("signOutSession", () => {
  it("signs out through the session client", async () => {
    sessionSignOut.mockResolvedValue({ error: null });
    await signOutSession();
    expect(sessionSignOut).toHaveBeenCalled();
  });
});
