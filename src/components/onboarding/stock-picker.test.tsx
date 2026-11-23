import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MAX_PICKS, POPULAR_COMPANIES } from "@/lib/onboarding/companies";

import { StockPicker } from "./stock-picker";

function setup(selected: string[] = [], limited = false) {
  const onToggle = vi.fn();
  const user = userEvent.setup();
  render(
    <StockPicker selected={selected} limited={limited} onToggle={onToggle} />,
  );
  return { user, onToggle };
}

describe("StockPicker", () => {
  it("lists every popular company and the selected count", () => {
    setup(["AAPL"]);
    expect(screen.getAllByRole("checkbox")).toHaveLength(
      POPULAR_COMPANIES.length,
    );
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("toggles a company", async () => {
    const { user, onToggle } = setup();
    await user.click(screen.getByRole("checkbox", { name: /nvidia/i }));
    expect(onToggle).toHaveBeenCalledWith("NVDA");
  });

  it("searches by name and by ticker", async () => {
    const { user } = setup();
    await user.type(screen.getByRole("searchbox"), "visa");
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "ko");
    expect(
      screen.getByRole("checkbox", { name: /coca-cola/i }),
    ).toBeInTheDocument();
  });

  it("filters by category and can return to All", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Finance" }));
    const finance = POPULAR_COMPANIES.filter((c) => c.category === "Finance");
    expect(screen.getAllByRole("checkbox")).toHaveLength(finance.length);
    // Pressing the active chip again must not leave the picker with no category.
    await user.click(screen.getByRole("button", { name: "Finance" }));
    expect(screen.getAllByRole("checkbox")).toHaveLength(finance.length);
    await user.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getAllByRole("checkbox")).toHaveLength(
      POPULAR_COMPANIES.length,
    );
  });

  it("says so when nothing matches", async () => {
    const { user } = setup();
    await user.type(screen.getByRole("searchbox"), "123");
    expect(screen.getByText(/no companies match/i)).toBeInTheDocument();
  });

  it("offers to add a ticker that is not in the list, then clears the search", async () => {
    const { user, onToggle } = setup();
    await user.type(screen.getByRole("searchbox"), "zzzz");
    await user.click(
      screen.getByRole("button", { name: /add “ZZZZ” to your watchlist/i }),
    );
    expect(onToggle).toHaveBeenCalledWith("ZZZZ");
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });

  it("does not offer to add popular tickers or text that is not a ticker", async () => {
    const { user } = setup();
    await user.type(screen.getByRole("searchbox"), "aapl");
    expect(screen.queryByRole("button", { name: /add “/i })).toBeNull();
    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "ab1");
    expect(screen.queryByRole("button", { name: /add “/i })).toBeNull();
  });

  it("explains the cap when an add was refused", () => {
    setup(["AAPL"], true);
    expect(screen.getByRole("alert")).toHaveTextContent(
      `up to ${MAX_PICKS} companies`,
    );
  });

  it("shows hand-added tickers as checked cards that can be unchecked", async () => {
    const { user, onToggle } = setup(["AAPL", "ZZZZ"]);
    const box = screen.getByRole("checkbox", { name: "ZZZZ (custom ticker)" });
    expect(box).toBeChecked();
    await user.click(box);
    expect(onToggle).toHaveBeenCalledWith("ZZZZ");
  });

  it("hides custom tickers that do not match the search", async () => {
    const { user } = setup(["ZZZZ"]);
    await user.type(screen.getByRole("searchbox"), "visa");
    expect(screen.queryByRole("checkbox", { name: /ZZZZ/ })).toBeNull();
  });

  it("Enter in the search box adds the offered ticker and never submits a form", async () => {
    const onToggle = vi.fn();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <StockPicker selected={[]} limited={false} onToggle={onToggle} />
        <button type="submit">Go</button>
      </form>,
    );
    await user.type(screen.getByRole("searchbox"), "tsla{Enter}");
    expect(onToggle).toHaveBeenCalledWith("TSLA");
    expect(onSubmit).not.toHaveBeenCalled();
    await user.type(screen.getByRole("searchbox"), "apple{Enter}");
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not offer a ticker for a word that matches a company", async () => {
    const { user } = setup();
    await user.type(screen.getByRole("searchbox"), "apple");
    expect(screen.queryByRole("button", { name: /add “/i })).toBeNull();
  });

  it("explains a saved list that is already over the cap", () => {
    const many = POPULAR_COMPANIES.slice(0, MAX_PICKS + 2).map((c) => c.ticker);
    setup(many);
    expect(screen.getByRole("alert")).toHaveTextContent(
      `You have ${many.length} saved`,
    );
  });
});
