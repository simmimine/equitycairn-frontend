import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { JoinBetaResult } from "@/lib/signup/types";

const joinBeta = vi.hoisted(() => vi.fn());
vi.mock("@/app/actions/join-beta", () => ({ joinBeta }));

import { SignupForm } from "./signup-form";

function setup() {
  const user = userEvent.setup();
  const utils = render(<SignupForm />);
  return { user, ...utils };
}

describe("SignupForm", () => {
  afterEach(cleanup);

  beforeEach(() => {
    joinBeta.mockReset();
  });

  it("shows an inline error and skips the action for an invalid address", async () => {
    const { user } = setup();
    const input = screen.getByLabelText(/email/i);
    await user.type(input, "not-an-email");
    await user.click(screen.getByRole("button"));

    expect(await screen.findByRole("alert")).toHaveTextContent(/valid email/i);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(joinBeta).not.toHaveBeenCalled();
  });

  it("calls the action with FormData for a valid address", async () => {
    joinBeta.mockResolvedValue({ ok: true } satisfies JoinBetaResult);
    const { user } = setup();
    await user.type(screen.getByLabelText(/email/i), "a@b.co");
    await user.click(screen.getByRole("button"));

    await waitFor(() => expect(joinBeta).toHaveBeenCalledTimes(1));
    const [prev, formData] = joinBeta.mock.calls[0];
    expect(prev).toBeNull();
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("email")).toBe("a@b.co");
  });

  it("disables the button and shows a spinner while pending", async () => {
    let resolve!: (result: JoinBetaResult) => void;
    joinBeta.mockReturnValue(
      new Promise<JoinBetaResult>((r) => {
        resolve = r;
      }),
    );
    const { user } = setup();
    await user.type(screen.getByLabelText(/email/i), "a@b.co");
    await user.click(screen.getByRole("button"));

    const button = await screen.findByRole("button");
    await waitFor(() => expect(button).toBeDisabled());
    expect(screen.getByRole("status")).toBeInTheDocument();

    resolve({ ok: true });
    await waitFor(() => expect(button).toBeEnabled());
  });

  it("shows success and clears the field on ok", async () => {
    joinBeta.mockResolvedValue({ ok: true } satisfies JoinBetaResult);
    const { user } = setup();
    const input = screen.getByLabelText(/email/i);
    await user.type(input, "a@b.co");
    await user.click(screen.getByRole("button"));

    expect(await screen.findByText(/you're on the list/i)).toBeInTheDocument();
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("shows a generic error on server_error", async () => {
    joinBeta.mockResolvedValue({
      ok: false,
      error: "server_error",
    } satisfies JoinBetaResult);
    const { user } = setup();
    await user.type(screen.getByLabelText(/email/i), "a@b.co");
    await user.click(screen.getByRole("button"));

    expect(
      await screen.findByText("Something went wrong, please try again"),
    ).toBeInTheDocument();
  });

  it("keeps the typed email after a server error", async () => {
    joinBeta.mockResolvedValue({
      ok: false,
      error: "server_error",
    } satisfies JoinBetaResult);
    const { user } = setup();
    const input = screen.getByLabelText(/email/i);
    await user.type(input, "a@b.co");
    await user.click(screen.getByRole("button"));

    await screen.findByText("Something went wrong, please try again");
    expect(input).toHaveValue("a@b.co");
  });

  it("calls the action once when submitted twice while pending", async () => {
    let resolve!: (result: JoinBetaResult) => void;
    joinBeta.mockReturnValue(
      new Promise<JoinBetaResult>((r) => {
        resolve = r;
      }),
    );
    const { user } = setup();
    await user.type(screen.getByLabelText(/email/i), "a@b.co");
    const button = screen.getByRole("button");
    await user.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    await user.click(button);
    await user.keyboard("{Enter}");

    expect(joinBeta).toHaveBeenCalledTimes(1);

    resolve({ ok: true });
    await waitFor(() => expect(button).toBeEnabled());
  });

  it("hides the honeypot from assistive tech and keyboard", () => {
    const { container } = setup();
    const honeypot = container.querySelector<HTMLInputElement>(
      'input[name="website"]',
    );
    expect(honeypot).not.toBeNull();
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot?.closest("[aria-hidden='true']")).not.toBeNull();
    expect(screen.queryByLabelText(/website/i)).toBeNull();
  });

  it("uses the id prop for unique input ids", () => {
    render(<SignupForm id="hero" />);
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("id", "hero");
  });
});
