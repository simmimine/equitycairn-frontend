import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HONEYPOT_FIELD } from "@/lib/signup/honeypot";
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
    expect(formData.get(HONEYPOT_FIELD)).toBe("");
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
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAccessibleName("Request beta access");
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("readonly");
    const spinner = button.querySelector('[data-slot="spinner"]');
    expect(spinner).not.toBeNull();
    expect(spinner).toHaveAttribute("aria-hidden", "true");

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

  it("shows an announced wait message on rate_limited, keeps the email, and clears on edit", async () => {
    joinBeta.mockResolvedValue({
      ok: false,
      error: "rate_limited",
      retryAfterSeconds: 30,
    } satisfies JoinBetaResult);
    const { user } = setup();
    const input = screen.getByLabelText(/email/i);
    await user.type(input, "a@b.co");
    await user.click(screen.getByRole("button"));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Please wait a minute before trying again");
    expect(input).toHaveValue("a@b.co");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", alert.id);
    expect(screen.queryByText(/you're on the list/i)).toBeNull();

    await user.type(input, "m");
    expect(
      screen.queryByText("Please wait a minute before trying again"),
    ).toBeNull();
    expect(input).toHaveValue("a@b.com");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("shows the inline success for the honeypot-style { ok: true } result", async () => {
    joinBeta.mockResolvedValue({ ok: true } satisfies JoinBetaResult);
    const { user } = setup();
    await user.type(screen.getByLabelText(/email/i), "a@b.co");
    await user.click(screen.getByRole("button"));
    expect(await screen.findByText("You're on the list")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
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
      `input[name="${HONEYPOT_FIELD}"]`,
    );
    expect(honeypot).not.toBeNull();
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot?.closest("[aria-hidden='true']")).not.toBeNull();
    expect(screen.queryByLabelText(/website/i)).toBeNull();
  });

  it("makes the input readOnly, not disabled, while pending so focus is not lost", async () => {
    let resolve!: (result: JoinBetaResult) => void;
    joinBeta.mockReturnValue(
      new Promise<JoinBetaResult>((r) => {
        resolve = r;
      }),
    );
    const { user } = setup();
    const input = screen.getByLabelText(/email/i);
    await user.type(input, "a@b.co");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(screen.getByRole("button")).toBeDisabled());
    expect(input).toHaveAttribute("readonly");
    expect(input).not.toBeDisabled();
    expect(input).toHaveFocus();

    resolve({ ok: true });
    await waitFor(() => expect(screen.getByRole("button")).toBeEnabled());
  });

  it("keeps a single status region mounted and fills it on success", async () => {
    joinBeta.mockResolvedValue({ ok: true } satisfies JoinBetaResult);
    const { user } = setup();
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();
    // Must stay in the accessibility tree (not display:none) so announcements work.
    expect(status.className).not.toMatch(/(^|\s)(empty:)?hidden(\s|$)/);
    expect(status).toHaveClass("sr-only");
    await user.type(screen.getByLabelText(/email/i), "a@b.co");
    await user.click(screen.getByRole("button"));
    await screen.findByText(/you're on the list/i);
    expect(screen.getByRole("status")).toBe(status);
    expect(status).not.toHaveClass("sr-only");
  });

  it("clears stale server errors and success messages on edit", async () => {
    joinBeta.mockResolvedValueOnce({
      ok: false,
      error: "server_error",
    } satisfies JoinBetaResult);
    const { user } = setup();
    const input = screen.getByLabelText(/email/i);
    await user.type(input, "a@b.co");
    await user.click(screen.getByRole("button"));
    await screen.findByText("Something went wrong, please try again");
    await user.type(input, "m");
    expect(
      screen.queryByText("Something went wrong, please try again"),
    ).toBeNull();

    joinBeta.mockResolvedValueOnce({ ok: true } satisfies JoinBetaResult);
    await user.click(screen.getByRole("button"));
    await screen.findByText(/you're on the list/i);
    await user.type(input, "x@y.co");
    expect(screen.queryByText(/you're on the list/i)).toBeNull();
  });

  it("uses the id prop for unique input ids", () => {
    render(<SignupForm id="hero" />);
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("id", "hero");
  });
});

describe("SignupForm when the action cannot be reached", () => {
  afterEach(cleanup);

  it("shows the generic error and keeps the email", async () => {
    const user = userEvent.setup();
    render(
      <SignupForm
        action={vi.fn().mockRejectedValue(new TypeError("offline"))}
      />,
    );
    const input = screen.getByLabelText(/email/i);
    await user.type(input, "a@b.co");
    await user.click(screen.getByRole("button"));
    expect(
      await screen.findByText("Something went wrong, please try again"),
    ).toBeInTheDocument();
    expect(input).toHaveValue("a@b.co");
  });
});
