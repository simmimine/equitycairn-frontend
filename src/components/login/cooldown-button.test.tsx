import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { UnrecognizedActionError } from "next/dist/client/components/unrecognized-action-error";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CooldownButton } from "./cooldown-button";

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("CooldownButton", () => {
  it("starts disabled from the server-provided cooldown and enables at zero", async () => {
    render(<CooldownButton initialCooldownSeconds={3} onResend={vi.fn()} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Re-send available in 0:03");
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByRole("button")).toBeEnabled();
    expect(screen.getByRole("button")).toHaveTextContent(
      "Resend confirmation email",
    );
  });

  it("restarts the countdown from the server's retryAfterSeconds", async () => {
    const onResend = vi.fn().mockResolvedValue({
      ok: false,
      error: "cooldown",
      retryAfterSeconds: 42,
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CooldownButton initialCooldownSeconds={0} onResend={onResend} />);
    await user.click(screen.getByRole("button"));
    expect(onResend).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole("button", { name: /re-send available in 0:42/i }),
    ).toBeDisabled();
  });
});

describe("CooldownButton in a tab older than the deployment", () => {
  it("reloads instead of failing forever", async () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { reload });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const view = render(
      <CooldownButton
        initialCooldownSeconds={0}
        onResend={async () => {
          throw new UnrecognizedActionError("gone");
        }}
      />,
    );
    await act(async () => {
      fireEvent.click(within(view.container).getByRole("button"));
    });
    expect(reload).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});
