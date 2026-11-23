import { beforeEach, describe, expect, it, vi } from "vitest";

const issueResend = vi.fn();
const sendVerificationEmail = vi.fn();

vi.mock("@/lib/signup/store", () => ({
  issueResend: (...a: unknown[]) => issueResend(...a),
}));
vi.mock("@/lib/email/verification-email", () => ({
  sendVerificationEmail: (...a: unknown[]) => sendVerificationEmail(...a),
}));
// The action needs the email address to send to; it is resolved via the store.
import { resendVerification } from "./resend-verification";

function captureConsole() {
  return (["log", "warn", "error", "info", "debug"] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation(() => {}),
  );
}

describe("resendVerification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendVerificationEmail.mockResolvedValue(true);
  });

  it("sends the email on `sent` and returns the cooldown", async () => {
    issueResend.mockResolvedValue({
      status: "sent",
      verifyToken: "v-raw",
      email: "ann@example.com",
    });
    expect(await resendVerification("m-raw")).toEqual({
      ok: true,
      retryAfterSeconds: 60,
    });
    expect(issueResend).toHaveBeenCalledWith("m-raw");
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      "ann@example.com",
      "v-raw",
    );
  });

  it("returns the identical result on `noop` without sending", async () => {
    issueResend.mockResolvedValue({ status: "noop" });
    expect(await resendVerification("m-raw")).toEqual({
      ok: true,
      retryAfterSeconds: 60,
    });
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("returns cooldown with the remaining seconds", async () => {
    issueResend.mockResolvedValue({
      status: "cooldown",
      retryAfterSeconds: 17,
    });
    expect(await resendVerification("m-raw")).toEqual({
      ok: false,
      error: "cooldown",
      retryAfterSeconds: 17,
    });
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("maps `invalid` to invalid_token", async () => {
    issueResend.mockResolvedValue({ status: "invalid" });
    expect(await resendVerification("m-raw")).toEqual({
      ok: false,
      error: "invalid_token",
    });
  });

  it.each([["", 123, null, undefined, {}]].flat())(
    "rejects a non-string/empty token %p without store calls",
    async (bad) => {
      expect(await resendVerification(bad as string)).toEqual({
        ok: false,
        error: "invalid_token",
      });
      expect(issueResend).not.toHaveBeenCalled();
    },
  );

  it("still returns ok when sending returns false or throws", async () => {
    issueResend.mockResolvedValue({
      status: "sent",
      verifyToken: "v-raw",
      email: "ann@example.com",
    });
    sendVerificationEmail.mockResolvedValueOnce(false);
    expect(await resendVerification("m-raw")).toEqual({
      ok: true,
      retryAfterSeconds: 60,
    });
    sendVerificationEmail.mockRejectedValueOnce(new Error("down"));
    expect(await resendVerification("m-raw")).toEqual({
      ok: true,
      retryAfterSeconds: 60,
    });
  });

  it("returns server_error when the store throws, logging nothing sensitive", async () => {
    const spies = captureConsole();
    issueResend.mockRejectedValue(new Error("signup store: boom"));
    expect(await resendVerification("m-secret")).toEqual({
      ok: false,
      error: "server_error",
    });
    const logged = spies.map((s) => JSON.stringify(s.mock.calls)).join("");
    expect(logged).toContain("signup store: boom");
    expect(logged).not.toContain("m-secret");
    spies.forEach((s) => s.mockRestore());
  });
});
