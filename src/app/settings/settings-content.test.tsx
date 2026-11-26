import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const getProfile = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock("@/lib/auth/session", () => ({ requireUser: () => requireUser() }));
vi.mock("@/lib/onboarding/store", () => ({
  getProfile: (...a: unknown[]) => getProfile(...a),
}));
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u) }));
vi.mock("@/app/actions/login", () => ({
  signOut: vi.fn(),
  signOutEverywhere: vi.fn(),
}));
vi.mock("@/app/actions/settings", () => ({ saveProfileAction: vi.fn() }));
vi.mock("@/app/actions/account-link", () => ({ requestAccountLink: vi.fn() }));
vi.mock("@/app/actions/bug-report", () => ({ reportBugAction: vi.fn() }));

import { SettingsContent } from "./settings-content";

const content = (from?: string) =>
  SettingsContent({ searchParams: Promise.resolve({ from }) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  requireUser.mockResolvedValue({ id: "u1", email: "ann@example.com" });
  getProfile.mockResolvedValue({
    firstName: "Ann",
    lastName: "Lee",
    role: null,
    experience: "beginner",
    onboardedAt: "2026-11-01T00:00:00Z",
  });
});

describe("SettingsContent", () => {
  it("sends users who haven't onboarded to /onboarding", async () => {
    getProfile.mockResolvedValue({ onboardedAt: null });
    await expect(content()).rejects.toThrow("NEXT_REDIRECT:/onboarding");
  });

  it("passes the session's details, keyed by user", async () => {
    vi.stubEnv("SUPPORT_EMAIL", "help@example.com");
    const element = await content("/feed");
    expect(element.key).toBe("u1");
    expect(element.props).toMatchObject({
      email: "ann@example.com",
      supportEmail: "help@example.com",
      fromPath: "/feed",
      profile: {
        firstName: "Ann",
        lastName: "Lee",
        role: null,
        experience: "beginner",
      },
    });
  });

  it("drops an outside address as the previous page", async () => {
    vi.stubEnv("SUPPORT_EMAIL", "");
    const element = await content("//evil.com");
    expect(element.props).toMatchObject({
      fromPath: null,
      supportEmail: null,
    });
  });
});
