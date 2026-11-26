import { act, fireEvent, render, screen } from "@testing-library/react";
import { Activity, useState } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubMatchMedia, stubResizeObserver } from "@/test-utils/dom-stubs";

import { AppHeader } from "./app-header";
import { ComingSoonProvider } from "./coming-soon";

const LABEL = "Search companies, tickers, or stories";
/** Tailwind's `md`, where the search field is always on screen. */
const DESKTOP = "(min-width: 48rem)";

function Harness({
  initialQuery = "",
  onChange,
}: {
  initialQuery?: string;
  onChange?: (q: string) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  return (
    <ComingSoonProvider>
      <AppHeader
        query={query}
        onQueryChange={(q) => {
          onChange?.(q);
          setQuery(q);
        }}
        firstName="Ann"
        signOutAction={vi.fn()}
      />
    </ComingSoonProvider>
  );
}

const input = () => screen.getByRole("searchbox", { name: LABEL });
const toggle = () => screen.getByRole("button", { name: "Search" });
const expanded = (value: boolean) =>
  expect(toggle()).toHaveAttribute("aria-expanded", String(value));

afterEach(() => {
  vi.restoreAllMocks();
});

// jsdom has neither; the header, sidebar and tab bar use both.
beforeEach(() => {
  stubMatchMedia();
  stubResizeObserver();
});

describe("AppHeader", () => {
  it("has the wordmark, one search input, help and the account menu", () => {
    render(<Harness />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "equitycairn" })).toHaveAttribute(
      "href",
      "/feed",
    );
    expect(screen.getAllByRole("searchbox")).toHaveLength(1);
    expect(input()).toHaveAttribute("placeholder", LABEL);
    expect(
      screen.getByRole("button", { name: "Account menu" }),
    ).toBeInTheDocument();
  });

  it("reports what is typed", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.change(input(), { target: { value: "apple" } });
    expect(onChange).toHaveBeenCalledWith("apple");
    expect(input()).toHaveValue("apple");
  });

  it("opens search from the magnifier and focuses it", () => {
    render(<Harness />);
    expanded(false);
    fireEvent.click(toggle());
    expanded(true);
    expect(input()).toHaveFocus();
  });

  it("publishes its height for the page's scroll padding", () => {
    // globals.css keeps a focused element clear of the header, which grows
    // with the phone search row.
    const style = document.documentElement.style;
    const { unmount } = render(<Harness />);
    // jsdom lays nothing out; the browser gives the real height.
    expect(style.getPropertyValue("--feed-header-height")).toBe("0px");
    unmount();
    expect(style.getPropertyValue("--feed-header-height")).toBe("");
  });

  it("clears the query when toggled closed", () => {
    render(<Harness />);
    fireEvent.click(toggle());
    fireEvent.change(input(), { target: { value: "apple" } });
    fireEvent.click(toggle());
    expanded(false);
    expect(input()).toHaveValue("");
  });

  it("stays shown while there is a query", () => {
    render(<Harness initialQuery="apple" />);
    expanded(true);
    fireEvent.click(toggle());
    expanded(false);
    expect(input()).toHaveValue("");
  });

  it("does not close under the user when they erase a query", () => {
    render(<Harness initialQuery="a" />);
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: "" } });
    expanded(true);
  });

  it.each([
    ["Ctrl+K", { key: "k", ctrlKey: true }],
    ["⌘K", { key: "k", metaKey: true }],
    ["Ctrl+K with caps lock", { key: "K", ctrlKey: true }],
    ["Ctrl+K on a Russian layout", { key: "л", code: "KeyK", ctrlKey: true }],
    ["⌘K on a Greek layout", { key: "κ", code: "KeyK", metaKey: true }],
  ])("opens and focuses search on %s", (_, keys) => {
    render(<Harness />);
    const notPrevented = fireEvent.keyDown(document.body, keys);
    expect(notPrevented).toBe(false);
    expect(input()).toHaveFocus();
    expanded(true);
  });

  it.each([
    ["a plain k", { key: "k" }],
    ["Ctrl+J", { key: "j", ctrlKey: true }],
    ["Ctrl+Shift+K", { key: "K", ctrlKey: true, shiftKey: true }],
    ["AltGr+K", { key: "k", ctrlKey: true, altKey: true }],
    // Dvorak puts T where QWERTY has K: that is Ctrl+T, not Ctrl+K.
    ["Ctrl+T on Dvorak's K key", { key: "t", code: "KeyK", ctrlKey: true }],
    ["Ctrl+K's key giving a digit", { key: "1", code: "KeyK", ctrlKey: true }],
  ])("leaves %s alone", (_, keys) => {
    render(<Harness />);
    expect(fireEvent.keyDown(document.body, keys)).toBe(true);
    expect(input()).not.toHaveFocus();
  });

  it("stops listening for the shortcut on unmount", () => {
    const { unmount } = render(<Harness />);
    unmount();
    expect(fireEvent.keyDown(document.body, { key: "k", ctrlKey: true })).toBe(
      true,
    );
  });

  it("clears and closes on Escape, handing focus to the magnifier", () => {
    render(<Harness />);
    fireEvent.click(toggle());
    fireEvent.change(input(), { target: { value: "apple" } });
    fireEvent.keyDown(input(), { key: "Escape" });
    expect(input()).toHaveValue("");
    expanded(false);
    expect(toggle()).toHaveFocus();
  });

  it("ignores other keys in the search input", () => {
    render(<Harness initialQuery="apple" />);
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(input()).toHaveValue("apple");
  });

  it("says help is coming soon", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Help is coming soon.",
    );
  });

  it("shows help as a muted question mark", () => {
    render(<Harness />);
    const help = screen.getByRole("button", { name: "Help" });
    expect(help).toHaveTextContent(/^\?$/);
    expect(help).toHaveClass(
      "text-sm",
      "font-semibold",
      "text-muted-foreground",
      "focus-visible:ring-3",
    );
  });

  it("keeps the search text at 16px except with a fine pointer", () => {
    render(<Harness />);
    expect(input()).toHaveClass(
      "text-base",
      "md:text-base",
      "md:pointer-fine:text-sm",
    );
    expect(input()).not.toHaveClass("md:text-sm");
  });

  describe("the shortcut hint", () => {
    const hint = () => screen.queryByText(/K$/, { selector: "kbd" });

    it.each([
      ["MacIntel", "⌘ K"],
      ["iPhone", "⌘ K"],
      ["iPad", "⌘ K"],
      ["Win32", "Ctrl K"],
      ["Linux x86_64", "Ctrl K"],
      ["", "Ctrl K"],
    ])("on %j says %s", (platform, label) => {
      vi.spyOn(navigator, "platform", "get").mockReturnValue(platform);
      render(<Harness />);
      expect(hint()).toHaveTextContent(label);
      expect(hint()).toHaveAttribute("aria-hidden", "true");
    });

    it("is left out of the server render, which cannot know the platform", () => {
      const html = renderToString(<Harness />);
      expect(html).not.toContain("<kbd");
      expect(html).toContain(LABEL);
    });
  });

  describe("across the phone/desktop breakpoint", () => {
    it("does not open the phone row when focused on a desktop", () => {
      stubMatchMedia({ [DESKTOP]: true });
      render(<Harness />);
      act(() => input().focus());
      expanded(false);
    });

    it("lets go of an empty field the phone layout hides", () => {
      const media = stubMatchMedia({ [DESKTOP]: true });
      render(<Harness />);
      act(() => input().focus());
      media.set(DESKTOP, false);
      expect(input()).not.toHaveFocus();
      expanded(false);
    });

    it("closes an empty row opened by the shortcut on a desktop", () => {
      const media = stubMatchMedia({ [DESKTOP]: true });
      render(<Harness />);
      fireEvent.keyDown(document.body, { key: "k", ctrlKey: true });
      expect(input()).toHaveFocus();
      media.set(DESKTOP, false);
      expanded(false);
      expect(input()).not.toHaveFocus();
    });

    it("keeps a field with text shown and focused", () => {
      const media = stubMatchMedia({ [DESKTOP]: true });
      render(<Harness initialQuery="apple" />);
      act(() => input().focus());
      media.set(DESKTOP, false);
      expect(input()).toHaveFocus();
      expanded(true);
    });

    it("starts closed after a phone, desktop, phone round trip", () => {
      const media = stubMatchMedia({ [DESKTOP]: false });
      render(<Harness />);
      fireEvent.click(toggle());
      expanded(true);
      media.set(DESKTOP, true);
      media.set(DESKTOP, false);
      expanded(false);
      expect(input()).not.toHaveFocus();
    });

    it("stops listening on unmount", () => {
      const media = stubMatchMedia({ [DESKTOP]: true });
      const { unmount } = render(<Harness />);
      expect(media.listeners(DESKTOP)).toBe(1);
      unmount();
      expect(media.listeners(DESKTOP)).toBe(0);
    });
  });

  it("leaves Escape to an open notice, keeping the search", () => {
    vi.useFakeTimers();
    render(<Harness initialQuery="apple" />);
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    act(() => input().focus());
    fireEvent.keyDown(input(), { key: "Escape" });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(input()).toHaveValue("apple");
    expect(input()).toHaveFocus();
    expanded(true);
    // With the notice gone, Escape clears the search again.
    fireEvent.keyDown(input(), { key: "Escape" });
    expect(input()).toHaveValue("");
    vi.useRealTimers();
  });

  it("comes back from a hidden route with search closed", () => {
    const view = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <Harness />
      </Activity>
    );
    const { rerender } = render(view("visible"));
    fireEvent.click(toggle());
    expanded(true);
    rerender(view("hidden"));
    rerender(view("visible"));
    expanded(false);
  });
});
