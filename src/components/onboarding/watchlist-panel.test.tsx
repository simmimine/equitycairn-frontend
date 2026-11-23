import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WatchlistPanel } from "./watchlist-panel";

describe("WatchlistPanel", () => {
  it("shows an empty state with a 0 / 10 counter", () => {
    render(<WatchlistPanel selected={[]} onRemove={vi.fn()} />);
    expect(screen.getByText("0 / 10")).toBeInTheDocument();
    expect(screen.getByText(/no companies yet/i)).toBeInTheDocument();
  });

  it("lists picks with company names, labelling tickers outside the list", () => {
    render(<WatchlistPanel selected={["AAPL", "ZZZZ"]} onRemove={vi.fn()} />);
    expect(screen.getByText("Apple Inc.")).toBeInTheDocument();
    expect(screen.getByText("ZZZZ")).toBeInTheDocument();
    expect(screen.getByText("Custom ticker")).toBeInTheDocument();
    expect(screen.getByText("2 / 10")).toBeInTheDocument();
  });

  it("removes a pick", async () => {
    const onRemove = vi.fn();
    render(<WatchlistPanel selected={["AAPL"]} onRemove={onRemove} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove AAPL" }));
    expect(onRemove).toHaveBeenCalledWith("AAPL");
  });
});
