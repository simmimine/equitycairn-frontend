import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const getProfile = vi.fn();
const saveName = vi.fn();
const saveAbout = vi.fn();
const saveWatchlist = vi.fn();
const markOnboarded = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/onboarding/store", () => ({
  getProfile: (...a: unknown[]) => getProfile(...a),
  saveName: (...a: unknown[]) => saveName(...a),
  saveAbout: (...a: unknown[]) => saveAbout(...a),
  saveWatchlist: (...a: unknown[]) => saveWatchlist(...a),
  markOnboarded: (...a: unknown[]) => markOnboarded(...a),
}));
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u) }));

import {
  finishOnboardingAction,
  saveAboutAction,
  saveNameAction,
  saveWatchlistAction,
} from "./onboarding";

const writes = [saveName, saveAbout, saveWatchlist, markOnboarded];

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ id: "u1" });
  getProfile.mockResolvedValue({
    firstName: "Ann",
    lastName: "Lee",
    role: null,
    experience: null,
    onboardedAt: null,
    tickers: [],
  });
});

describe("signed out", () => {
  it.each([
    ["saveName", () => saveNameAction("Ann", "Lee")],
    ["saveAbout", () => saveAboutAction("other", "beginner")],
    ["saveWatchlist", () => saveWatchlistAction("AAPL")],
    ["finish", () => finishOnboardingAction()],
  ])("%s refuses and writes nothing", async (_n, run) => {
    getUser.mockResolvedValue(null);
    expect(await run()).toEqual({ ok: false, error: "unauthenticated" });
    for (const w of writes) expect(w).not.toHaveBeenCalled();
  });
});

describe("already onboarded", () => {
  it.each([
    ["saveName", () => saveNameAction("Ann", "Lee")],
    ["saveAbout", () => saveAboutAction("other", "beginner")],
    ["saveWatchlist", () => saveWatchlistAction("AAPL")],
  ])("%s does not write", async (_n, run) => {
    getProfile.mockResolvedValue({
      firstName: "Ann",
      lastName: "Lee",
      role: null,
      experience: null,
      onboardedAt: "2026-11-24T00:00:00Z",
      tickers: [],
    });
    expect(await run()).toEqual({ ok: false, error: "already_onboarded" });
    for (const w of writes) expect(w).not.toHaveBeenCalled();
  });
});

describe("saveNameAction", () => {
  it("saves a valid name for the signed-in user", async () => {
    getProfile.mockResolvedValue(null);
    expect(await saveNameAction(" Ann ", "Lee")).toEqual({ ok: true });
    expect(saveName).toHaveBeenCalledWith("u1", "Ann", "Lee");
  });
  it("rejects markup", async () => {
    expect(await saveNameAction("<script>", "Lee")).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(saveName).not.toHaveBeenCalled();
  });
});

describe("saveAboutAction", () => {
  it("stores skipped answers as null", async () => {
    expect(await saveAboutAction("", "skip")).toEqual({ ok: true });
    expect(saveAbout).toHaveBeenCalledWith("u1", null, null);
  });
  it("rejects unknown values", async () => {
    expect(await saveAboutAction("king", "beginner")).toEqual({
      ok: false,
      error: "invalid",
    });
  });
});

describe("saveWatchlistAction", () => {
  it("normalizes and saves tickers", async () => {
    expect(await saveWatchlistAction("aapl, msft  tsla")).toEqual({ ok: true });
    expect(saveWatchlist).toHaveBeenCalledWith("u1", ["AAPL", "MSFT", "TSLA"]);
  });
  it("rejects more than 50", async () => {
    const many = Array.from(
      { length: 51 },
      (_, i) =>
        String.fromCharCode(65 + Math.floor(i / 26)) +
        String.fromCharCode(65 + (i % 26)),
    ).join(" ");
    expect(await saveWatchlistAction(many)).toEqual({
      ok: false,
      error: "too_many",
    });
    expect(saveWatchlist).not.toHaveBeenCalled();
  });
  it("rejects invalid symbols", async () => {
    expect(await saveWatchlistAction("AAPL; DROP")).toEqual({
      ok: false,
      error: "invalid",
    });
  });
});

describe("finishOnboardingAction", () => {
  it("marks onboarded and redirects to /feed", async () => {
    await expect(finishOnboardingAction()).rejects.toThrow(
      "NEXT_REDIRECT:/feed",
    );
    expect(markOnboarded).toHaveBeenCalledWith("u1");
  });
  it("refuses when the name was never saved", async () => {
    getProfile.mockResolvedValue(null);
    expect(await finishOnboardingAction()).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(markOnboarded).not.toHaveBeenCalled();
  });
});
