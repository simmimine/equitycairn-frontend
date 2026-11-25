import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ResendResult } from "@/lib/signup/types";

const { resendVerification } = vi.hoisted(() => ({
  resendVerification: vi.fn<(token: string) => Promise<ResendResult>>(),
}));
vi.mock("@/app/actions/resend-verification", () => ({ resendVerification }));

import { ResendButton } from "./resend-button";

async function click(el: HTMLElement, times = 1) {
  await act(async () => {
    for (let i = 0; i < times; i++) fireEvent.click(el);
  });
}

describe("ResendButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resendVerification.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("starts disabled with the countdown from props (refresh keeps the cooldown)", () => {
    render(<ResendButton token="tok" initialCooldownSeconds={42} />);
    const button = screen.getByRole("button", {
      name: /Re-send available in 0:42/,
    });
    expect(button).toBeDisabled();
  });

  it("counts down each second and enables at zero", () => {
    render(<ResendButton token="tok" initialCooldownSeconds={3} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(
      screen.getByRole("button", { name: /Re-send available in 0:02/ }),
    ).toBeDisabled();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(
      screen.getByRole("button", { name: "Resend confirmation email" }),
    ).toBeEnabled();
  });

  it("is enabled immediately when there is no cooldown", () => {
    render(<ResendButton token="tok" initialCooldownSeconds={0} />);
    expect(
      screen.getByRole("button", { name: "Resend confirmation email" }),
    ).toBeEnabled();
  });

  it("calls the action once, shows pending, then restarts the countdown", async () => {
    let resolve!: (r: ResendResult) => void;
    resendVerification.mockReturnValue(
      new Promise<ResendResult>((r) => {
        resolve = r;
      }),
    );
    render(<ResendButton token="tok" initialCooldownSeconds={0} />);
    const button = screen.getByRole("button", {
      name: "Resend confirmation email",
    });
    await click(button, 2);
    expect(resendVerification).toHaveBeenCalledTimes(1);
    expect(resendVerification).toHaveBeenCalledWith("tok");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      resolve({ ok: true, retryAfterSeconds: 60 });
    });
    expect(
      screen.getByRole("button", { name: /Re-send available in 1:00/ }),
    ).toBeDisabled();
    expect(
      screen.getByText("If your address is on the list, we've sent a new link"),
    ).toBeInTheDocument();
  });

  it("keeps a polite live region mounted from the start", () => {
    const { container } = render(
      <ResendButton token="tok" initialCooldownSeconds={5} />,
    );
    const region = container.querySelector('[aria-live="polite"]');
    expect(region).not.toBeNull();
    expect(region).toBeEmptyDOMElement();
  });

  it("restarts the countdown from the server value on a cooldown error", async () => {
    resendVerification.mockResolvedValue({
      ok: false,
      error: "cooldown",
      retryAfterSeconds: 25,
    });
    render(<ResendButton token="tok" initialCooldownSeconds={0} />);
    await click(
      screen.getByRole("button", { name: "Resend confirmation email" }),
    );
    expect(
      screen.getByRole("button", { name: /Re-send available in 0:25/ }),
    ).toBeDisabled();
  });

  it.each(["server_error", "invalid_token"] as const)(
    "shows an inline error on %s and stays usable",
    async (error) => {
      resendVerification.mockResolvedValue({ ok: false, error });
      render(<ResendButton token="tok" initialCooldownSeconds={0} />);
      await click(
        screen.getByRole("button", { name: "Resend confirmation email" }),
      );
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Resend confirmation email" }),
      ).toBeEnabled();
    },
  );

  it("clears timers on unmount", () => {
    const { unmount } = render(
      <ResendButton token="tok" initialCooldownSeconds={10} />,
    );
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
