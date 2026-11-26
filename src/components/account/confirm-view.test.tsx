import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConfirmView } from "./confirm-view";

const changePassword = vi.fn();
const deleteAccount = vi.fn();
const PW = "Zq9!kd2#vL0w";

function show(purpose: "password_change" | "account_delete") {
  render(
    <ConfirmView
      purpose={purpose}
      token="tok"
      changePassword={changePassword}
      deleteAccount={deleteAccount}
    />,
  );
  return userEvent.setup();
}

async function submitPassword(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("New password"), PW);
  await user.type(screen.getByLabelText("Confirm new password"), PW);
  await user.click(screen.getByRole("button", { name: "Change password" }));
}

beforeEach(() => {
  changePassword.mockReset().mockResolvedValue({ ok: true });
  deleteAccount.mockReset().mockResolvedValue({ ok: true });
});

describe("ConfirmView", () => {
  it("changes the password only when submitted", async () => {
    const user = show("password_change");
    expect(changePassword).not.toHaveBeenCalled();
    await submitPassword(user);
    expect(changePassword).toHaveBeenCalledWith("tok", PW, PW);
    expect(
      await screen.findByRole("heading", { name: "Password changed" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("deletes only when the button is pressed, and says it is permanent", async () => {
    const user = show("account_delete");
    expect(screen.getByText(/permanent/i)).toBeInTheDocument();
    expect(deleteAccount).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete my account" }));
    expect(deleteAccount).toHaveBeenCalledWith("tok");
    expect(
      await screen.findByRole("heading", { name: "Account deleted" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to home" }),
    ).toBeInTheDocument();
  });

  it("runs once for two quick presses", async () => {
    deleteAccount.mockReturnValue(new Promise(() => {}));
    const user = show("account_delete");
    const button = screen.getByRole("button", { name: "Delete my account" });
    await user.dblClick(button);
    expect(deleteAccount).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
  });

  it("shows that a used link no longer works", async () => {
    deleteAccount.mockResolvedValue({ ok: false, error: "expired" });
    const user = show("account_delete");
    await user.click(screen.getByRole("button", { name: "Delete my account" }));
    expect(
      await screen.findByRole("heading", { name: "This link no longer works" }),
    ).toBeInTheDocument();
  });

  it.each([
    [
      { ok: false, error: "password", passwordError: "common" },
      "That password is too common, choose another",
    ],
    [
      { ok: false, error: "rate_limited", retryAfterSeconds: 60 },
      "Too many attempts. Please wait a few minutes and try again.",
    ],
    [
      { ok: false, error: "server_error" },
      "Something went wrong. Request a new link from Settings and try again.",
    ],
    [
      { ok: false, error: "rejected" },
      "That password was rejected. Choose a different one.",
    ],
  ])("keeps the form and explains %o", async (result, text) => {
    changePassword.mockResolvedValue(result);
    const user = show("password_change");
    await submitPassword(user);
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toHaveValue(PW);
  });
});
