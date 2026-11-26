import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const peekLink = vi.fn();
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
