import { fireEvent, render, screen } from "@testing-library/react";
import { Activity } from "react";
import { describe, expect, it, vi } from "vitest";

import { AccountMenu } from "./account-menu";

function open() {
  fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
}

describe("AccountMenu", () => {
  it("shows the upper-cased initial on the avatar button", () => {
    render(<AccountMenu firstName="ann" signOutAction={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Account menu" }),
    ).toHaveTextContent(/^A$/);
  });

  it.each([null, "", "  "])("shows a user icon for the name %j", (name) => {
    render(<AccountMenu firstName={name} signOutAction={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Account menu" });
    expect(button).toHaveTextContent(/^$/);
    expect(button.querySelector("svg")).not.toBeNull();
    open();
    expect(screen.getByText("Your account")).toBeInTheDocument();
  });

  it("is closed until the button is pressed, then shows the name", async () => {
    render(<AccountMenu firstName="Ann" signOutAction={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    open();
    expect(
      await screen.findByRole("dialog", { name: "Ann" }),
    ).toBeInTheDocument();
  });

  it("links to settings above sign out, and closes when followed", async () => {
    render(<AccountMenu firstName="Ann" signOutAction={vi.fn()} />);
    open();
    const link = await screen.findByRole("link", { name: "Settings" });
    expect(link).toHaveAttribute("href", "/settings?from=/feed");
    expect(
      link.compareDocumentPosition(
        screen.getByRole("button", { name: "Sign out" }),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // jsdom cannot navigate.
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    await vi.waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("takes another settings address", async () => {
    render(
      <AccountMenu
        firstName="Ann"
        signOutAction={vi.fn()}
        settingsHref="/settings"
      />,
    );
    open();
    expect(
      await screen.findByRole("link", { name: "Settings" }),
    ).toHaveAttribute("href", "/settings");
  });

  it("calls the sign out action", async () => {
    const signOutAction = vi.fn();
    render(<AccountMenu firstName="Ann" signOutAction={signOutAction} />);
    open();
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    await vi.waitFor(() => {
      expect(signOutAction).toHaveBeenCalledTimes(1);
    });
  });

  it("colours the initial as a link on the secondary disc", () => {
    render(<AccountMenu firstName="Ann" signOutAction={vi.fn()} />);
    expect(screen.getByText("A")).toHaveClass("bg-secondary", "text-link");
  });

  it("is closed again when a hidden route is shown", async () => {
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <AccountMenu firstName="Ann" signOutAction={vi.fn()} />
      </Activity>
    );
    const { rerender } = render(page("visible"));
    open();
    await screen.findByRole("dialog");
    rerender(page("hidden"));
    rerender(page("visible"));
    await vi.waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Account menu" }),
    ).toHaveAttribute("aria-expanded", "false");
  });
});
