import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const confirmAccount = vi.fn();
vi.mock("@/app/actions/confirm-account", () => ({
  confirmAccount: (...a: unknown[]) => confirmAccount(...a),
}));

import { ConfirmContent } from "./confirm-content";

describe("ConfirmContent", () => {
  it("shows an invalid-link state without params", async () => {
    render(await ConfirmContent({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/this link isn.t valid/i)).toBeInTheDocument();
  });

  it("renders only a form for a valid link and changes nothing on render", async () => {
    render(
      await ConfirmContent({
        searchParams: Promise.resolve({
          token_hash: "th",
          email: "a@example.com",
        }),
      }),
    );
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(confirmAccount).not.toHaveBeenCalled();
  });
});
