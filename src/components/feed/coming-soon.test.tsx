import { act, fireEvent, render, screen } from "@testing-library/react";
import { Activity } from "react";
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

  const message = () => screen.getByText("Help is coming soon.");
  const dismissButton = () => screen.getByRole("button", { name: "Dismiss" });
  const hover = () => fireEvent.pointerEnter(message());
  const unhover = () => fireEvent.pointerLeave(message());
  const focus = () => act(() => dismissButton().focus());
  const blur = () => act(() => dismissButton().blur());

  it.each([
    ["hovered", hover, unhover],
    ["focused", focus, blur],
  ])("stays while %s, then hides 4 seconds after", (_, hold, release) => {
    renderProvider();
    press("Help");
    wait(3000);
    hold();
    wait(60_000);
    expect(message()).toBeInTheDocument();
    release();
    wait(3999);
    expect(message()).toBeInTheDocument();
    wait(1);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it.each([
    ["the pointer leaves but focus stays", unhover],
    ["focus leaves but the pointer stays", blur],
  ])("stays paused when %s", (_, release) => {
    renderProvider();
    press("Help");
    hover();
    focus();
    release();
    wait(60_000);
    expect(message()).toBeInTheDocument();
  });

  it("stays paused when a new notice replaces a held one", () => {
    renderProvider();
    press("Profile");
    fireEvent.pointerEnter(screen.getByText("Profile is coming soon."));
    press("Help");
    wait(60_000);
    expect(message()).toBeInTheDocument();
  });

  it.each([
    ["hovered", hover],
    ["focused", focus],
  ])("times the next notice after a %s one is dismissed", (_, hold) => {
    renderProvider();
    press("Help");
    hold();
    press("Dismiss");
    press("Help");
    wait(4000);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("drops the notice and timer when a hidden route is shown again", () => {
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <ComingSoonProvider>
          <Trigger feature="Help" />
        </ComingSoonProvider>
      </Activity>
    );
    const { rerender } = render(page("visible"));
    press("Help");
    hover();
    unhover();
    rerender(page("hidden"));
    expect(vi.getTimerCount()).toBe(0);
    rerender(page("visible"));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    press("Help");
    wait(4000);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("gives Dismiss the focus ring", () => {
    renderProvider();
    press("Help");
    expect(dismissButton()).toHaveClass("focus-visible:ring-3");
  });

  it("refuses to be used without the provider", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger feature="Help" />)).toThrow(
      "ComingSoonProvider",
    );
    error.mockRestore();
  });
});
