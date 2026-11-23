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
vi.mock("@/app/actions/login", () => ({ signOut: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u) }));

import { FeedContent } from "./feed-content";

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue({ id: "u1" });
});

describe("FeedContent", () => {
  it("sends users who haven't onboarded to /onboarding", async () => {
    getProfile.mockResolvedValue(null);
    await expect(FeedContent()).rejects.toThrow("NEXT_REDIRECT:/onboarding");
    getProfile.mockResolvedValue({ onboardedAt: null, tickers: [] });
    await expect(FeedContent()).rejects.toThrow("NEXT_REDIRECT:/onboarding");
  });

  it("shows the watchlist tickers for an onboarded user", async () => {
    getProfile.mockResolvedValue({
      firstName: "Ann",
      onboardedAt: "2026-11-24T00:00:00Z",
      tickers: ["AAPL", "MSFT"],
    });
    render(await FeedContent());
    expect(
      screen.getByRole("heading", { name: "News for your watchlist" }),
    ).toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("MSFT")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();
  });

  it("shows an empty state with no tickers", async () => {
    getProfile.mockResolvedValue({
      firstName: "Ann",
      onboardedAt: "2026-11-24T00:00:00Z",
      tickers: [],
    });
    render(await FeedContent());
    expect(screen.getByText(/no companies yet/i)).toBeInTheDocument();
  });
});
