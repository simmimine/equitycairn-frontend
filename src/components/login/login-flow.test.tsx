import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const checkEmail = vi.fn();
const resendBetaVerification = vi.fn();
const createAccount = vi.fn();
const signIn = vi.fn();
vi.mock("@/app/actions/login", () => ({
  checkEmail: (...a: unknown[]) => checkEmail(...a),
  resendBetaVerification: (...a: unknown[]) => resendBetaVerification(...a),
  createAccount: (...a: unknown[]) => createAccount(...a),
  signIn: (...a: unknown[]) => signIn(...a),
}));

import { LoginFlow } from "./login-flow";

const EMAIL = "ann@example.com";

async function submitEmail(state: string) {
  checkEmail.mockResolvedValue({ ok: true, state });
  const user = userEvent.setup();
  render(<LoginFlow />);
  await user.type(screen.getByLabelText("Email"), EMAIL);
  await user.click(screen.getByRole("button", { name: /continue/i }));
  return user;
}

beforeEach(() => {
  for (const m of [checkEmail, resendBetaVerification, createAccount, signIn])
    m.mockReset();
});

describe("LoginFlow", () => {
  it("rejects an invalid email without calling the server", async () => {
    const user = userEvent.setup();
    render(<LoginFlow />);
    await user.type(screen.getByLabelText("Email"), "nope");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(checkEmail).not.toHaveBeenCalled();
    expect(screen.getByText(/enter a valid email/i)).toBeInTheDocument();
  });

  it("tells a non-member to join the beta", async () => {
    await submitEmail("not_listed");
    expect(
      await screen.findByText(/isn.t on the beta list yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /join the beta/i }),
    ).toHaveAttribute("href", "/#join");
  });

  it("asks an unverified member to verify and can re-send", async () => {
    resendBetaVerification.mockResolvedValue({
      ok: true,
      retryAfterSeconds: 60,
    });
    const user = await submitEmail("unverified");
    expect(
      await screen.findByText(/verify your beta sign-up first/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /re-send/i }));
    expect(resendBetaVerification).toHaveBeenCalledWith(EMAIL);
    expect(
      await screen.findByRole("button", { name: /re-send available in 1:00/i }),
    ).toBeDisabled();
  });

  it("shows the create-password card and surfaces password errors", async () => {
    createAccount.mockResolvedValue({
      ok: false,
      error: "password",
      passwordError: "mismatch",
    });
    const user = await submitEmail("no_account");
    await user.type(await screen.findByLabelText("Password"), "Zq9!kd2#vL0w");
    await user.type(
      screen.getByLabelText("Confirm password"),
      "different-1234",
    );
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(createAccount).toHaveBeenCalledWith(
      EMAIL,
      "Zq9!kd2#vL0w",
      "different-1234",
    );
    expect(
      await screen.findByText(/passwords don.t match/i),
    ).toBeInTheDocument();
  });

  it("moves to check-your-email after creating an account", async () => {
    createAccount.mockResolvedValue({ ok: true, retryAfterSeconds: 60 });
    const user = await submitEmail("no_account");
    await user.type(await screen.findByLabelText("Password"), "Zq9!kd2#vL0w");
    await user.type(screen.getByLabelText("Confirm password"), "Zq9!kd2#vL0w");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
  });

  it("shows sign-in for an existing account and reports bad credentials", async () => {
    signIn.mockResolvedValue({ ok: false, error: "invalid_credentials" });
    const user = await submitEmail("has_account");
    await user.type(
      await screen.findByLabelText("Password"),
      "wrong-password-1",
    );
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(signIn).toHaveBeenCalledWith(EMAIL, "wrong-password-1");
    expect(
      await screen.findByText(/email or password is incorrect/i),
    ).toBeInTheDocument();
  });

  it("goes back to the email card", async () => {
    const user = await submitEmail("has_account");
    await user.click(
      await screen.findByRole("button", { name: /use a different email/i }),
    );
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("shows a rate-limit message", async () => {
    checkEmail.mockResolvedValue({
      ok: false,
      error: "rate_limited",
      retryAfterSeconds: 30,
    });
    const user = userEvent.setup();
    render(<LoginFlow />);
    await user.type(screen.getByLabelText("Email"), EMAIL);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText(/too many attempts/i)).toBeInTheDocument();
  });
});
