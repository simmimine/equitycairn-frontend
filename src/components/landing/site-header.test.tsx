import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  afterEach(cleanup);

  it("moves focus to the hero email input when Join the beta is clicked", async () => {
    const user = userEvent.setup();
    render(
      <>
        <SiteHeader />
        <input id="hero-email" aria-label="Email" />
      </>,
    );
    const link = screen.getByRole("link", { name: "Join the beta" });
    expect(link).toHaveAttribute("href", "#join");
    await user.click(link);
    expect(screen.getByLabelText("Email")).toHaveFocus();
  });
});
