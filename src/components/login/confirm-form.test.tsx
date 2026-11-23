import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const confirmAccount = vi.fn();
vi.mock("@/app/actions/confirm-account", () => ({
  confirmAccount: (...a: unknown[]) => confirmAccount(...a),
}));

import { ConfirmForm } from "./confirm-form";

beforeEach(() => confirmAccount.mockReset());

describe("ConfirmForm", () => {
  it("submits token, email and password", async () => {
    confirmAccount.mockResolvedValue({ ok: false, error: "wrong_password" });
    render(<ConfirmForm tokenHash="th" email="a@example.com" />);
    await userEvent.type(screen.getByLabelText("Password"), "my-password-1");
    await userEvent.click(screen.getByRole("button", { name: /finish/i }));
    expect(confirmAccount).toHaveBeenCalledWith(
      "th",
      "a@example.com",
      "my-password-1",
    );
  });

  it("explains a wrong password", async () => {
    confirmAccount.mockResolvedValue({ ok: false, error: "wrong_password" });
    render(<ConfirmForm tokenHash="th" email="a@example.com" />);
    await userEvent.type(screen.getByLabelText("Password"), "x");
    await userEvent.click(screen.getByRole("button", { name: /finish/i }));
    expect(
      await screen.findByText(/doesn.t match the password you created/i),
    ).toBeInTheDocument();
  });

  it("links back to login when the token has expired", async () => {
    confirmAccount.mockResolvedValue({ ok: false, error: "expired" });
    render(<ConfirmForm tokenHash="th" email="a@example.com" />);
    await userEvent.type(screen.getByLabelText("Password"), "x");
    await userEvent.click(screen.getByRole("button", { name: /finish/i }));
    expect(await screen.findByText(/link has expired/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start again/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
