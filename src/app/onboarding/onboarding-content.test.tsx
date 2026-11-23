import { render, screen } from "@testing-library/react";
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
vi.mock("@/app/actions/onboarding", () => ({
  saveNameAction: vi.fn(),
  saveAboutAction: vi.fn(),
  saveWatchlistAction: vi.fn(),
  finishOnboardingAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (u: string) => redirect(u),
  useRouter: () => ({ replace: vi.fn() }),
}));

import { OnboardingContent } from "./onboarding-content";

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue({ id: "u1" });
});

describe("OnboardingContent", () => {
  it("redirects finished users to /feed", async () => {
    getProfile.mockResolvedValue({
      onboardedAt: "2026-11-24T00:00:00Z",
      tickers: [],
    });
    await expect(OnboardingContent()).rejects.toThrow("NEXT_REDIRECT:/feed");
  });

  it("starts at the name step for a brand-new user", async () => {
    getProfile.mockResolvedValue(null);
    render(await OnboardingContent());
    expect(screen.getByLabelText("First name")).toBeInTheDocument();
  });

  it("resumes at About you when the name is already saved", async () => {
    getProfile.mockResolvedValue({
      firstName: "Ann",
      lastName: "Lee",
      role: null,
      experience: null,
      onboardedAt: null,
      tickers: [],
    });
    render(await OnboardingContent());
    expect(
      screen.getByRole("heading", { name: /about you/i }),
    ).toBeInTheDocument();
  });
});
