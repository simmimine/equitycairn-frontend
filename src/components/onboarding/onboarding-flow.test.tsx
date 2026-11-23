import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const saveNameAction = vi.fn();
const saveAboutAction = vi.fn();
const saveWatchlistAction = vi.fn();
const finishOnboardingAction = vi.fn();
vi.mock("@/app/actions/onboarding", () => ({
  saveNameAction: (...a: unknown[]) => saveNameAction(...a),
  saveAboutAction: (...a: unknown[]) => saveAboutAction(...a),
  saveWatchlistAction: (...a: unknown[]) => saveWatchlistAction(...a),
  finishOnboardingAction: (...a: unknown[]) => finishOnboardingAction(...a),
}));

import { OnboardingFlow } from "./onboarding-flow";

const EMPTY = {
  firstName: "",
  lastName: "",
  role: "",
  experience: "",
  tickers: "",
};

beforeEach(() => {
  for (const m of [
    saveNameAction,
    saveAboutAction,
    saveWatchlistAction,
    finishOnboardingAction,
  ])
    m.mockReset();
  saveNameAction.mockResolvedValue({ ok: true });
  saveAboutAction.mockResolvedValue({ ok: true });
  saveWatchlistAction.mockResolvedValue({ ok: true });
  finishOnboardingAction.mockResolvedValue({ ok: true });
});

async function toAbout() {
  const user = userEvent.setup();
  render(<OnboardingFlow initial={EMPTY} startStep="name" />);
  await user.type(screen.getByLabelText("First name"), "Ann");
  await user.type(screen.getByLabelText("Last name"), "Lee");
  await user.click(screen.getByRole("button", { name: /continue/i }));
  await screen.findByRole("heading", { name: /about you/i });
  return user;
}

describe("OnboardingFlow", () => {
  it("saves the name and moves to About you", async () => {
    await toAbout();
    expect(saveNameAction).toHaveBeenCalledWith("Ann", "Lee");
  });

  it("shows a server validation error on the name card", async () => {
    saveNameAction.mockResolvedValue({ ok: false, error: "invalid" });
    const user = userEvent.setup();
    render(<OnboardingFlow initial={EMPTY} startStep="name" />);
    await user.type(screen.getByLabelText("First name"), "<b>");
    await user.type(screen.getByLabelText("Last name"), "Lee");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText(/letters, spaces/i)).toBeInTheDocument();
  });

  it("Skip on About saves no answers", async () => {
    const user = await toAbout();
    await user.click(screen.getByRole("button", { name: /skip/i }));
    expect(saveAboutAction).toHaveBeenCalledWith("", "");
    expect(
      await screen.findByRole("heading", { name: /welcome/i }),
    ).toBeInTheDocument();
  });

  it("saves chosen role and experience", async () => {
    const user = await toAbout();
    await user.click(screen.getByLabelText("Retail investor"));
    await user.click(screen.getByLabelText("Beginner"));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(saveAboutAction).toHaveBeenCalledWith("retail_investor", "beginner");
  });

  it("Back keeps what was typed", async () => {
    const user = await toAbout();
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByLabelText("First name")).toHaveValue("Ann");
  });

  it("welcome copy makes no real-time or all-news claims", async () => {
    const user = await toAbout();
    await user.click(screen.getByRole("button", { name: /skip/i }));
    const heading = await screen.findByRole("heading", { name: /welcome/i });
    const text = heading.closest("div[data-slot='card']")?.textContent ?? "";
    expect(text).not.toMatch(/real-time|all news/i);
    expect(text).toMatch(/links to publishers/i);
  });

  it("saves the watchlist then finishes", async () => {
    const user = userEvent.setup();
    render(
      <OnboardingFlow
        initial={{ ...EMPTY, firstName: "Ann", lastName: "Lee" }}
        startStep="watchlist"
      />,
    );
    await user.type(screen.getByLabelText(/tickers/i), "aapl msft");
    await user.click(screen.getByRole("button", { name: /finish/i }));
    expect(saveWatchlistAction).toHaveBeenCalledWith("aapl msft");
    expect(finishOnboardingAction).toHaveBeenCalled();
  });

  it("can skip the watchlist and still finishes", async () => {
    const user = userEvent.setup();
    render(
      <OnboardingFlow
        initial={{ ...EMPTY, firstName: "Ann", lastName: "Lee" }}
        startStep="watchlist"
      />,
    );
    await user.click(screen.getByRole("button", { name: /skip/i }));
    expect(saveWatchlistAction).not.toHaveBeenCalled();
    expect(finishOnboardingAction).toHaveBeenCalled();
  });

  it("does not finish when saving the watchlist fails", async () => {
    saveWatchlistAction.mockResolvedValue({ ok: false, error: "invalid" });
    const user = userEvent.setup();
    render(
      <OnboardingFlow
        initial={{ ...EMPTY, firstName: "Ann", lastName: "Lee" }}
        startStep="watchlist"
      />,
    );
    await user.type(screen.getByLabelText(/tickers/i), "AAPL;");
    await user.click(screen.getByRole("button", { name: /finish/i }));
    expect(await screen.findByText(/one to six letters/i)).toBeInTheDocument();
    expect(finishOnboardingAction).not.toHaveBeenCalled();
  });
});
