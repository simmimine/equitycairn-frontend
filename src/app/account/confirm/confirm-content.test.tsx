import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const peekLink = vi.fn();
const connection = vi.fn();
vi.mock("next/server", () => ({ connection: () => connection() }));
const confirmPasswordChange = vi.fn();
const confirmAccountDeletion = vi.fn();
vi.mock("@/lib/account/links", () => ({
  peekLink: (...a: unknown[]) => peekLink(...a),
}));
vi.mock("@/app/actions/account-link", () => ({
  confirmPasswordChange: (...a: unknown[]) => confirmPasswordChange(...a),
  confirmAccountDeletion: (...a: unknown[]) => confirmAccountDeletion(...a),
}));

import { ConfirmContent } from "./confirm-content";

const TOKEN = "a".repeat(43);

async function show(token?: string | string[]) {
  render(await ConfirmContent({ searchParams: Promise.resolve({ token }) }));
}

beforeEach(() => vi.clearAllMocks());

describe("account ConfirmContent", () => {
  it.each([
    ["missing", undefined],
    ["short", "abc"],
    ["bad characters", `${"a".repeat(42)}<`],
    ["repeated", [TOKEN, TOKEN]],
  ])("rejects a %s token without looking it up", async (_, token) => {
    await show(token);
    expect(
      screen.getByRole("heading", { name: "This link no longer works" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Request a new one from Settings.")).toBeVisible();
    expect(peekLink).not.toHaveBeenCalled();
  });

  // Looking a link up reads the clock, which Next forbids while prerendering.
  it("waits for the real request before looking the link up", async () => {
    const order: string[] = [];
    connection.mockImplementation(async () => {
      order.push("connection");
    });
    peekLink.mockImplementation(async () => {
      order.push("peekLink");
      return null;
    });
    await show(TOKEN);
    expect(order).toEqual(["connection", "peekLink"]);
  });

  // After a change or deletion, Next redraws this page on the server (the action
  // clears the session cookie) while the link is already used up.
  it.each([
    ["Delete my account", "account_delete", "Account deleted"],
    ["Change password", "password_change", "Password changed"],
  ])(
    "keeps the success screen after %s redraws the page",
    async (name, purpose, heading) => {
      confirmAccountDeletion.mockResolvedValue({ ok: true });
      confirmPasswordChange.mockResolvedValue({ ok: true });
      peekLink.mockResolvedValue({ userId: "u1", purpose });
      const page = () =>
        ConfirmContent({ searchParams: Promise.resolve({ token: TOKEN }) });
      const view = render(await page());
      const user = userEvent.setup();
      if (purpose === "password_change") {
        await user.type(screen.getByLabelText("New password"), "x".repeat(14));
        await user.type(
          screen.getByLabelText("Confirm new password"),
          "x".repeat(14),
        );
      }
      await user.click(screen.getByRole("button", { name }));
      await screen.findByRole("heading", { name: heading });

      peekLink.mockResolvedValue(null);
      view.rerender(await page());
      expect(
        screen.getByRole("heading", { name: heading }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: "This link no longer works" }),
      ).not.toBeInTheDocument();
    },
  );

  it("keeps the form if the page is redrawn before the result arrives", async () => {
    confirmAccountDeletion.mockReturnValue(new Promise(() => {}));
    peekLink.mockResolvedValue({ userId: "u1", purpose: "account_delete" });
    const page = () =>
      ConfirmContent({ searchParams: Promise.resolve({ token: TOKEN }) });
    const view = render(await page());
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Delete my account" }));
    peekLink.mockResolvedValue(null);
    view.rerender(await page());
    expect(
      screen.getByRole("button", { name: "Delete my account" }),
    ).toBeDisabled();
  });

  it("rejects a used or expired token", async () => {
    peekLink.mockResolvedValue(null);
    await show(TOKEN);
    expect(
      screen.getByRole("heading", { name: "This link no longer works" }),
    ).toBeInTheDocument();
  });

  it("shows the view for the stored purpose and changes nothing", async () => {
    peekLink.mockResolvedValue({ userId: "u1", purpose: "account_delete" });
    await show(TOKEN);
    expect(
      screen.getByRole("button", { name: "Delete my account" }),
    ).toBeInTheDocument();
    expect(peekLink).toHaveBeenCalledWith(TOKEN);
    expect(confirmAccountDeletion).not.toHaveBeenCalled();
    expect(confirmPasswordChange).not.toHaveBeenCalled();
  });
});
