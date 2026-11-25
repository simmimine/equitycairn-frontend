import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const signOut = vi.hoisted(() => vi.fn());
const getProfile = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock("@/lib/auth/session", () => ({ requireUser: () => requireUser() }));
vi.mock("@/lib/onboarding/store", () => ({
  getProfile: (...a: unknown[]) => getProfile(...a),
}));
vi.mock("@/app/actions/login", () => ({ signOut }));
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

  it("shows the feed for an onboarded user's watchlist", async () => {
    getProfile.mockResolvedValue({
      firstName: "Ann",
      onboardedAt: "2026-11-24T00:00:00Z",
      tickers: ["AAPL", "MSFT"],
    });
    render(await FeedContent());
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "News for your watchlist",
      }),
    ).toBeInTheDocument();
    const watchlist = screen.getByRole("list", { name: "Your watchlist" });
    expect(within(watchlist).getByText("AAPL")).toBeInTheDocument();
    expect(within(watchlist).getByText("MSFT")).toBeInTheDocument();
    expect(within(watchlist).getByText("Apple Inc.")).toBeInTheDocument();
    expect(screen.getByText("Ann")).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "Stories" })).getAllByRole(
        "article",
      ),
    ).toHaveLength(4);
    expect(
      screen.getByRole("button", { name: "Account menu" }),
    ).toBeInTheDocument();
  });

  it("wires the account menu to sign out", async () => {
    getProfile.mockResolvedValue({
      firstName: "Ann",
      onboardedAt: "2026-11-24T00:00:00Z",
      tickers: ["AAPL"],
    });
    render(await FeedContent());
    await userEvent.click(screen.getByRole("button", { name: "Account menu" }));
    expect(signOut).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("keys the feed by user, so one user's filters never reach another", async () => {
    getProfile.mockResolvedValue({
      firstName: "Ann",
      onboardedAt: "2026-11-24T00:00:00Z",
      tickers: ["AAPL"],
    });
    expect((await FeedContent()).key).toBe("u1");
  });

  it("shows an empty state with no tickers", async () => {
    getProfile.mockResolvedValue({
      firstName: null,
      onboardedAt: "2026-11-24T00:00:00Z",
      tickers: [],
    });
    render(await FeedContent());
    expect(
      screen.getByRole("heading", { name: "No companies yet" }),
    ).toBeInTheDocument();
  });
});
