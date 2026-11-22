import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("renders the product name and tagline", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: "EquityCairn" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/matters to your watchlist/i)).toBeInTheDocument();
  });
});
