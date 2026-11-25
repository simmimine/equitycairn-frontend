import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ContextPanel } from "./context-panel";

const notice = vi.hoisted(() => vi.fn());

vi.mock("./coming-soon", () => ({ useComingSoon: () => notice }));

const companies = [
  { ticker: "AAPL", name: "Apple Inc." },
  { ticker: "ZZZZ", name: null },
];

beforeEach(() => {
  notice.mockReset();
});

describe("ContextPanel", () => {
  it("explains where the tickers came from", () => {
    render(<ContextPanel companies={companies} />);
    const panel = screen.getByRole("complementary", {
      name: "Coverage at a glance",
    });
    expect(
      within(panel).getByRole("heading", { name: "Coverage at a glance" }),
    ).toBeInTheDocument();
    expect(panel).toHaveTextContent(
      "Your feed follows the tickers you selected during onboarding.",
    );
  });

  it("lists each company, with only the ticker when the name is unknown", () => {
    render(<ContextPanel companies={companies} />);
    const [apple, unknown] = screen.getAllByRole("listitem");
    expect(apple).toHaveTextContent("AAPL");
    expect(apple).toHaveTextContent("Apple Inc.");
    expect(unknown).toHaveTextContent(/^ZZZZ$/);
  });

  it("says watchlist management is coming soon", async () => {
    render(<ContextPanel companies={companies} />);
    await userEvent.click(
      screen.getByRole("button", { name: /manage watchlist/i }),
    );
    expect(notice).toHaveBeenCalledWith("Watchlist management");
  });

  it("renders a 50-ticker watchlist", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      ticker: `T${i}`,
      name: `Company ${i}`,
    }));
    render(<ContextPanel companies={many} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(50);
  });
});
