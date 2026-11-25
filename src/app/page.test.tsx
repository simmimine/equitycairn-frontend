import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { joinBeta } = vi.hoisted(() => ({ joinBeta: vi.fn() }));
vi.mock("@/app/actions/join-beta", () => ({ joinBeta }));

import Home from "./page";

describe("Home", () => {
  afterEach(cleanup);

  it("renders the tagline as the level-1 heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Know what matters across your watchlist.",
      }),
    ).toBeInTheDocument();
  });

  it("offers the beta sign-up form twice", () => {
    render(<Home />);
    const inputs = screen.getAllByRole("textbox", { name: "Email address" });
    expect(inputs.map((input) => input.id)).toEqual([
      "hero-email",
      "cta-email",
    ]);
  });

  it("labels the feed preview as illustrative", () => {
    render(<Home />);
    expect(screen.getByText(/illustrative stories/i)).toBeInTheDocument();
  });

  it("states that it is not investment advice", () => {
    render(<Home />);
    expect(
      screen.getByText(/doesn.t provide investment advice/i),
    ).toBeInTheDocument();
  });

  it("makes no real-time or all-news claims", () => {
    const { container } = render(<Home />);
    expect(container.textContent).not.toMatch(
      /real[- ]?time|all[- ]news|all the news|instant|live (news|prices)/i,
    );
  });
});
