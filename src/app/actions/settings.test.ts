import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const getProfile = vi.fn();
const saveName = vi.fn();
const saveAbout = vi.fn();
const revalidatePath = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: (...a: unknown[]) => revalidatePath(...a),
}));
vi.mock("@/lib/auth/session", () => ({ getUser: () => getUser() }));
vi.mock("@/lib/onboarding/store", () => ({
  getProfile: (...a: unknown[]) => getProfile(...a),
  saveName: (...a: unknown[]) => saveName(...a),
  saveAbout: (...a: unknown[]) => saveAbout(...a),
}));

import { saveProfileAction } from "./settings";

const INPUT = {
  firstName: " Ann ",
  lastName: "Lee",
  role: "other",
  experience: "skip",
};

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ id: "u1" });
  getProfile.mockResolvedValue({ onboardedAt: "2026-11-01T00:00:00Z" });
});

afterEach(() => vi.restoreAllMocks());

describe("saveProfileAction", () => {
  it("saves trimmed values and refreshes the pages that show them", async () => {
    expect(await saveProfileAction(INPUT)).toEqual({ ok: true });
    expect(saveName).toHaveBeenCalledWith("u1", "Ann", "Lee");
    expect(saveAbout).toHaveBeenCalledWith("u1", "other", null);
    expect(revalidatePath).toHaveBeenCalledWith("/feed");
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("needs a session", async () => {
    getUser.mockResolvedValue(null);
    expect(await saveProfileAction(INPUT)).toEqual({
      ok: false,
      error: "unauthenticated",
    });
    expect(saveName).not.toHaveBeenCalled();
  });

  it("refuses someone who has not finished onboarding", async () => {
    getProfile.mockResolvedValue(null);
    expect(await saveProfileAction(INPUT)).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(saveName).not.toHaveBeenCalled();
  });

  it.each([
    { firstName: "" },
    { firstName: "<b>" },
    { lastName: "a".repeat(61) },
    { role: "admin" },
    { experience: "guru" },
  ])("saves nothing for %o", async (bad) => {
    expect(await saveProfileAction({ ...INPUT, ...bad })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(saveName).not.toHaveBeenCalled();
    expect(saveAbout).not.toHaveBeenCalled();
  });

  it("rejects a missing payload", async () => {
    expect(await saveProfileAction(null as never)).toEqual({
      ok: false,
      error: "invalid",
    });
  });

  it("reports a failed save", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    saveName.mockRejectedValue(new Error("db down"));
    expect(await saveProfileAction(INPUT)).toEqual({
      ok: false,
      error: "server_error",
    });
  });
});
