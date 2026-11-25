import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ComingSoonProvider, useComingSoon } from "./coming-soon";

function Trigger({ feature }: { feature: string }) {
  const comingSoon = useComingSoon();
  return <button onClick={() => comingSoon(feature)}>{feature}</button>;
}

function renderProvider() {
  return render(
    <ComingSoonProvider>
      <Trigger feature="Help" />
      <Trigger feature="Profile" />
    </ComingSoonProvider>,
  );
}

function press(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

function wait(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("ComingSoonProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps an empty status region mounted from the start", () => {
    renderProvider();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("shows the notice and hides it after 4 seconds", () => {
    renderProvider();
    press("Help");
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("Help is coming soon.");
    wait(3999);
    expect(region).toHaveTextContent("Help is coming soon.");
    wait(1);
    expect(region).toBeEmptyDOMElement();
  });

  it("replaces the text and restarts the timer on a new call", () => {
    renderProvider();
    press("Help");
    wait(3000);
    press("Profile");
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("Profile is coming soon.");
    expect(region).not.toHaveTextContent("Help");
    wait(3999);
    expect(region).toHaveTextContent("Profile is coming soon.");
    wait(1);
    expect(region).toBeEmptyDOMElement();
  });

  it("restarts the timer when the same feature is asked for again", () => {
    renderProvider();
    press("Help");
    wait(3000);
    press("Help");
    wait(3000);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Help is coming soon.",
    );
  });

  it("can be dismissed", () => {
    renderProvider();
    press("Help");
    press("Dismiss");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the timer on unmount", () => {
    const { unmount } = renderProvider();
    press("Help");
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("refuses to be used without the provider", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger feature="Help" />)).toThrow(
      "ComingSoonProvider",
    );
    error.mockRestore();
  });
});
