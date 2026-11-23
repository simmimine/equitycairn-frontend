import { render, screen, within } from "@testing-library/react";
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
const NAMED = { ...EMPTY, firstName: "Ann", lastName: "Lee" };

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

const cont = () => screen.getByRole("button", { name: /^continue/i });

async function toAbout() {
  const user = userEvent.setup();
  render(<OnboardingFlow initial={EMPTY} startStep="name" />);
  await user.type(screen.getByLabelText("First name"), "Ann");
  await user.type(screen.getByLabelText("Last name"), "Lee");
  await user.click(cont());
  await screen.findByRole("heading", { name: /about you/i });
  return user;
}

async function toWatchlist(initial = NAMED) {
  const user = userEvent.setup();
  render(<OnboardingFlow initial={initial} startStep="watchlist" />);
  return user;
}

describe("OnboardingFlow · chrome", () => {
  it("shows progress for the current step", async () => {
    await toAbout();
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
    expect(screen.getByText("02 / 04")).toBeInTheDocument();
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent(
      "About you",
    );
  });
});

describe("OnboardingFlow · name", () => {
  it("saves the name and moves to About you", async () => {
    await toAbout();
    expect(saveNameAction).toHaveBeenCalledWith("Ann", "Lee");
  });

  it("has no Back button on the first step", () => {
    render(<OnboardingFlow initial={EMPTY} startStep="name" />);
    expect(screen.queryByRole("button", { name: /back/i })).toBeNull();
  });

  it("shows a server validation error and stays on the step", async () => {
    saveNameAction.mockResolvedValue({ ok: false, error: "invalid" });
    const user = userEvent.setup();
    render(<OnboardingFlow initial={EMPTY} startStep="name" />);
    await user.type(screen.getByLabelText("First name"), "<b>");
    await user.type(screen.getByLabelText("Last name"), "Lee");
    await user.click(cont());
    expect(await screen.findByText(/letters, spaces/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /what should we call you/i }),
    ).toBeInTheDocument();
  });

  it("tells the user when the session has ended", async () => {
    saveNameAction.mockResolvedValue({ ok: false, error: "unauthenticated" });
    const user = userEvent.setup();
    render(<OnboardingFlow initial={NAMED} startStep="name" />);
    await user.click(cont());
    expect(await screen.findByText(/session has ended/i)).toBeInTheDocument();
  });

  it("shows a generic message for unexpected failures", async () => {
    saveNameAction.mockResolvedValue({ ok: false, error: "server_error" });
    const user = userEvent.setup();
    render(<OnboardingFlow initial={NAMED} startStep="name" />);
    await user.click(cont());
    expect(
      await screen.findByText(/something went wrong/i),
    ).toBeInTheDocument();
  });

  it("ignores a second submit while the first is saving", async () => {
    let resolve!: (v: { ok: true }) => void;
    saveNameAction.mockReturnValue(new Promise((r) => (resolve = r)));
    const user = userEvent.setup();
    render(<OnboardingFlow initial={NAMED} startStep="name" />);
    await user.click(cont());
    await user.click(cont());
    expect(saveNameAction).toHaveBeenCalledTimes(1);
    resolve({ ok: true });
    await screen.findByRole("heading", { name: /about you/i });
  });
});

describe("OnboardingFlow · about", () => {
  it("Skip saves no answers", async () => {
    const user = await toAbout();
    await user.click(screen.getByRole("button", { name: /skip for now/i }));
    expect(saveAboutAction).toHaveBeenCalledWith("", "");
    expect(
      await screen.findByRole("heading", { name: /welcome to equitycairn/i }),
    ).toBeInTheDocument();
  });

  it("saves the chosen role and experience", async () => {
    const user = await toAbout();
    await user.click(screen.getByRole("radio", { name: "Retail investor" }));
    await user.click(screen.getByRole("radio", { name: "Beginner" }));
    await user.click(cont());
    expect(saveAboutAction).toHaveBeenCalledWith("retail_investor", "beginner");
  });

  it("lets the user change an answer", async () => {
    const user = await toAbout();
    await user.click(screen.getByRole("radio", { name: "Other" }));
    await user.click(screen.getByRole("radio", { name: "Financial adviser" }));
    await user.click(cont());
    expect(saveAboutAction).toHaveBeenCalledWith("financial_adviser", "");
  });

  it("continues with nothing chosen (both questions are optional)", async () => {
    const user = await toAbout();
    await user.click(cont());
    expect(saveAboutAction).toHaveBeenCalledWith("", "");
  });

  it("restores saved answers", () => {
    render(
      <OnboardingFlow
        initial={{ ...NAMED, role: "other", experience: "experienced" }}
        startStep="about"
      />,
    );
    expect(screen.getByRole("radio", { name: "Other" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Experienced" })).toBeChecked();
  });

  it("Back keeps what was typed", async () => {
    const user = await toAbout();
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByLabelText("First name")).toHaveValue("Ann");
  });
});

describe("OnboardingFlow · welcome", () => {
  async function toWelcome() {
    const user = await toAbout();
    await user.click(screen.getByRole("button", { name: /skip for now/i }));
    await screen.findByRole("heading", { name: /welcome to equitycairn/i });
    return user;
  }

  it("copy makes no real-time or all-news claims and credits publishers", async () => {
    await toWelcome();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/real-time|all news/i);
    expect(text).toMatch(/publisher and original link stay visible/i);
    expect(text).toMatch(/information, not advice/i);
  });

  it("Choose companies moves to the watchlist without saving anything", async () => {
    const user = await toWelcome();
    await user.click(screen.getByRole("button", { name: /choose companies/i }));
    expect(
      await screen.findByRole("heading", {
        name: /choose companies to follow/i,
      }),
    ).toBeInTheDocument();
    expect(saveWatchlistAction).not.toHaveBeenCalled();
    // Regression: the welcome button must not double as the next step's submit.
    expect(finishOnboardingAction).not.toHaveBeenCalled();
  });
});

describe("OnboardingFlow · watchlist", () => {
  it("saves the picked tickers then finishes", async () => {
    const user = await toWatchlist();
    await user.click(screen.getByRole("checkbox", { name: /apple/i }));
    await user.click(screen.getByRole("checkbox", { name: /microsoft/i }));
    await user.click(cont());
    expect(saveWatchlistAction).toHaveBeenCalledWith("AAPL MSFT");
    expect(finishOnboardingAction).toHaveBeenCalled();
  });

  it("restores saved tickers, including ones outside the popular list", async () => {
    await toWatchlist({ ...NAMED, tickers: "AAPL, ZZZZ" });
    const panel = screen
      .getByRole("heading", { name: /your watchlist/i })
      .closest("[data-slot='card']") as HTMLElement;
    expect(within(panel).getByText("AAPL")).toBeInTheDocument();
    expect(within(panel).getByText("ZZZZ")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /apple/i })).toBeChecked();
  });

  it("removing a pick from the panel unchecks it and saves the rest", async () => {
    const user = await toWatchlist({ ...NAMED, tickers: "AAPL MSFT" });
    await user.click(screen.getByRole("button", { name: "Remove AAPL" }));
    expect(screen.getByRole("checkbox", { name: /apple/i })).not.toBeChecked();
    await user.click(cont());
    expect(saveWatchlistAction).toHaveBeenCalledWith("MSFT");
  });

  it("I'll do this later skips saving and still finishes", async () => {
    const user = await toWatchlist();
    await user.click(screen.getByRole("button", { name: /do this later/i }));
    expect(saveWatchlistAction).not.toHaveBeenCalled();
    expect(finishOnboardingAction).toHaveBeenCalled();
  });

  it("an empty list still saves and finishes", async () => {
    const user = await toWatchlist();
    await user.click(cont());
    expect(saveWatchlistAction).toHaveBeenCalledWith("");
    expect(finishOnboardingAction).toHaveBeenCalled();
  });

  it("does not finish when saving the watchlist fails", async () => {
    saveWatchlistAction.mockResolvedValue({ ok: false, error: "invalid" });
    const user = await toWatchlist();
    await user.click(cont());
    expect(await screen.findByText(/one to six letters/i)).toBeInTheDocument();
    expect(finishOnboardingAction).not.toHaveBeenCalled();
  });

  it("shows an error when finishing fails", async () => {
    finishOnboardingAction.mockResolvedValue({
      ok: false,
      error: "server_error",
    });
    const user = await toWatchlist();
    await user.click(cont());
    expect(
      await screen.findByText(/something went wrong/i),
    ).toBeInTheDocument();
  });

  it("Back returns to the welcome step", async () => {
    const user = await toWatchlist();
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(
      await screen.findByRole("heading", { name: /welcome to equitycairn/i }),
    ).toBeInTheDocument();
  });
});

describe("OnboardingFlow · injected actions", () => {
  it("uses the actions prop instead of the server actions", async () => {
    const saveName = vi.fn().mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(
      <OnboardingFlow
        initial={NAMED}
        startStep="name"
        actions={{
          saveName,
          saveAbout: vi.fn(),
          saveWatchlist: vi.fn(),
          finish: vi.fn(),
        }}
      />,
    );
    await user.click(cont());
    expect(saveName).toHaveBeenCalledWith("Ann", "Lee");
    expect(saveNameAction).not.toHaveBeenCalled();
  });
});
