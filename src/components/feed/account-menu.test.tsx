import { fireEvent, render, screen } from "@testing-library/react";
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

  it("calls the sign out action", async () => {
    const signOutAction = vi.fn();
    render(<AccountMenu firstName="Ann" signOutAction={signOutAction} />);
    open();
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    await vi.waitFor(() => {
      expect(signOutAction).toHaveBeenCalledTimes(1);
    });
  });
});
