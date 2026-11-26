import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const checkAttempts = vi.fn();
const insertBugReport = vi.fn();
const sendBugReportEmail = vi.fn();
const afterCallbacks: (() => unknown)[] = [];

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  after: (cb: () => unknown) => {
    afterCallbacks.push(cb);
  },
}));
vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/auth/attempts", () => ({
  checkAttempts: (...a: unknown[]) => checkAttempts(...a),
}));
vi.mock("@/lib/bugs/store", () => ({
  insertBugReport: (...a: unknown[]) => insertBugReport(...a),
}));
vi.mock("@/lib/email/bug-report-email", () => ({
  sendBugReportEmail: (...a: unknown[]) => sendBugReportEmail(...a),
}));

import { reportBugAction } from "./bug-report";

const INPUT = {
  whatHappened: "It broke",
  expected: "",
  pagePath: "/feed",
  browser: "Firefox",
  screen: "390x844",
};
const USER = { id: "u1", email: "ann@example.com" };

async function runAfter() {
  for (const cb of afterCallbacks.splice(0)) await cb();
}

beforeEach(() => {
  vi.clearAllMocks();
  afterCallbacks.length = 0;
  getUser.mockResolvedValue(USER);
  checkAttempts.mockResolvedValue({ allowed: true });
  insertBugReport.mockResolvedValue(undefined);
  sendBugReportEmail.mockResolvedValue(true);
});

afterEach(() => vi.restoreAllMocks());

describe("reportBugAction", () => {
  it("saves first, then emails", async () => {
    expect(await reportBugAction(INPUT)).toEqual({ ok: true });
    expect(checkAttempts).toHaveBeenCalledWith("bug-report", "u1", {
      max: 5,
      windowSeconds: 3600,
    });
    expect(insertBugReport).toHaveBeenCalled();
    expect(sendBugReportEmail).not.toHaveBeenCalled();
    await runAfter();
    expect(sendBugReportEmail).toHaveBeenCalledWith(
      expect.objectContaining({ whatHappened: "It broke" }),
      USER,
    );
  });

  it("needs a session", async () => {
    getUser.mockResolvedValue(null);
    expect(await reportBugAction(INPUT)).toEqual({
      ok: false,
      error: "unauthenticated",
    });
    expect(insertBugReport).not.toHaveBeenCalled();
  });

  it("rejects an empty report without counting it", async () => {
    expect(await reportBugAction({ ...INPUT, whatHappened: " " })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(checkAttempts).not.toHaveBeenCalled();
  });

  it("is rate limited", async () => {
    checkAttempts.mockResolvedValue({ allowed: false, retryAfterSeconds: 7 });
    expect(await reportBugAction(INPUT)).toEqual({
      ok: false,
      error: "rate_limited",
      retryAfterSeconds: 7,
    });
    expect(insertBugReport).not.toHaveBeenCalled();
  });

  it("sends no email when saving fails, and logs no report text", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    insertBugReport.mockRejectedValue(new Error("down"));
    expect(await reportBugAction(INPUT)).toEqual({
      ok: false,
      error: "server_error",
    });
    await runAfter();
    expect(sendBugReportEmail).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join(" ")).not.toContain("It broke");
  });

  it.each([
    ["returns false", () => sendBugReportEmail.mockResolvedValue(false)],
    ["throws", () => sendBugReportEmail.mockRejectedValue(new Error("x"))],
  ])("still succeeds when the email %s", async (_, arrange) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    arrange();
    expect(await reportBugAction(INPUT)).toEqual({ ok: true });
    await expect(runAfter()).resolves.toBeUndefined();
  });
});
