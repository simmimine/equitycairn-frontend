import { fireEvent, render, screen } from "@testing-library/react";
import { Activity, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { AppHeader } from "./app-header";
import { ComingSoonProvider } from "./coming-soon";

const LABEL = "Search companies, tickers, or stories";

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
    expect(screen.getByText("⌘ K")).toBeInTheDocument();
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

  it("marks the header while the phone search row is open", () => {
    // globals.css widens the page's scroll padding to the taller header.
    render(<Harness />);
    const header = screen.getByRole("banner");
    expect(header).not.toHaveAttribute("data-search-open");
    fireEvent.click(toggle());
    expect(header).toHaveAttribute("data-search-open");
    fireEvent.click(toggle());
    expect(header).not.toHaveAttribute("data-search-open");
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
