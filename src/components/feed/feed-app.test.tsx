import { fireEvent, render, screen, within } from "@testing-library/react";
import { Activity } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getFeed } from "@/lib/feed/get-feed";
import type { Feed } from "@/lib/feed/types";

import { FeedApp } from "./feed-app";

const NOW = new Date("2026-11-25T12:00:00Z");
const SEARCH = "Search companies, tickers, or stories";

let feed: Feed;

beforeEach(async () => {
  feed = await getFeed(["AAPL", "NVDA", "MSFT"], NOW);
});

function renderApp(f: Feed = feed, firstName: string | null = "Ann") {
  return render(
    <FeedApp feed={f} firstName={firstName} signOutAction={vi.fn()} />,
  );
}

const stories = () =>
  within(screen.getByRole("list", { name: "Stories" })).getAllByRole("article");
const pill = (name: string) =>
  within(screen.getByRole("group", { name: "Filter by company" })).getByRole(
    "button",
    { name },
  );
const search = () => screen.getByRole("searchbox", { name: SEARCH });

describe("FeedApp", () => {
  it("lays out the header, sidebar, main, context panel and tab bar", () => {
    renderApp();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Sidebar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Coverage at a glance" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Tabs" }),
    ).toBeInTheDocument();
    const main = screen.getByRole("main");
    expect(
      within(main).getByRole("heading", {
        level: 1,
        name: "News for your watchlist",
      }),
    ).toBeInTheDocument();
    expect(
      within(main).getByText(
        "Company coverage, grouped and ordered by publication time.",
      ),
    ).toBeInTheDocument();
    expect(
      within(main).getByText("Coverage around your followed companies."),
    ).toBeInTheDocument();
    expect(within(main).getByText("Newest first")).toBeInTheDocument();
    expect(within(main).getByText("Example items")).toBeInTheDocument();
    expect(
      within(main).getByText(
        "Example content only · sources shown here are placeholders.",
      ),
    ).toBeInTheDocument();
  });

  it("shows every story, newest first", () => {
    renderApp();
    expect(stories()).toHaveLength(6);
    expect(
      within(stories()[0]).getByRole("heading", {
        name: "Example coverage: company updates its services lineup",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("6 stories shown")).toBeInTheDocument();
  });

  it("narrows by ticker", () => {
    renderApp();
    fireEvent.click(pill("AAPL"));
    expect(pill("AAPL")).toHaveAttribute("aria-pressed", "true");
    expect(stories()).toHaveLength(2);
    for (const story of stories()) {
      expect(within(story).getByText("AAPL")).toBeInTheDocument();
    }
    fireEvent.click(pill("All"));
    expect(stories()).toHaveLength(6);
  });

  it("narrows by time range", () => {
    renderApp();
    const time = screen.getByRole("combobox", { name: "Time range" });
    fireEvent.change(time, { target: { value: "24h" } });
    expect(stories()).toHaveLength(3);
    fireEvent.change(time, { target: { value: "7d" } });
    expect(stories()).toHaveLength(4);
    fireEvent.change(time, { target: { value: "30d" } });
    expect(stories()).toHaveLength(5);
  });

  it("narrows by source", () => {
    renderApp();
    fireEvent.change(screen.getByRole("combobox", { name: "Source" }), {
      target: { value: "Company filing" },
    });
    expect(stories()).toHaveLength(2);
    for (const story of stories()) {
      expect(within(story).getByText("Company filing")).toBeInTheDocument();
    }
  });

  it("narrows by search and announces the count", () => {
    renderApp();
    fireEvent.change(search(), { target: { value: "services" } });
    expect(stories()).toHaveLength(1);
    expect(screen.getByText("1 story shown")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("clears every filter after a combination that matches nothing", () => {
    renderApp();
    fireEvent.click(pill("AAPL"));
    fireEvent.change(screen.getByRole("combobox", { name: "Time range" }), {
      target: { value: "24h" },
    });
    fireEvent.change(search(), { target: { value: "filing" } });

    expect(screen.queryByRole("list", { name: "Stories" })).toBeNull();
    expect(
      screen.getByRole("heading", { name: "No stories match these filters" }),
    ).toBeInTheDocument();
    expect(screen.getByText("0 stories shown")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    // The button is gone: focus must not fall back to the body.
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
    expect(stories()).toHaveLength(6);
    expect(search()).toHaveValue("");
    expect(pill("All")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("combobox", { name: "Time range" })).toHaveValue(
      "any",
    );
  });

  it("explains an empty watchlist and shows no filters", async () => {
    renderApp(await getFeed([], NOW), null);
    expect(
      screen.getByRole("heading", { name: "No companies yet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Add companies to follow and their news will appear here. Adding companies is coming soon.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Filter by company" }),
    ).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("list", { name: "Stories" })).toBeNull();
    expect(screen.queryByText("Newest first")).toBeNull();
    // Nothing that talks about tickers or sources there are none of.
    expect(
      screen.queryByRole("complementary", { name: "Coverage at a glance" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Report a ticker mismatch" }),
    ).toBeNull();
    expect(screen.queryByText(/Example content only/)).toBeNull();
  });

  it("says mismatch reporting is coming soon", () => {
    renderApp();
    fireEvent.click(
      screen.getByRole("button", { name: "Report a ticker mismatch" }),
    );
    expect(
      screen.getByText("Mismatch reporting is coming soon."),
    ).toBeInTheDocument();
  });

  it("pads page scrolling past the header and tab bar only while shown", () => {
    const { unmount } = renderApp();
    expect(document.documentElement).toHaveClass("feed-scroll-padding");
    unmount();
    expect(document.documentElement).not.toHaveClass("feed-scroll-padding");
  });

  it("keeps filters but drops the scroll padding while its route is hidden", () => {
    const view = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <FeedApp feed={feed} firstName="Ann" signOutAction={vi.fn()} />
      </Activity>
    );
    const { rerender } = render(view("visible"));
    fireEvent.click(pill("AAPL"));
    rerender(view("hidden"));
    expect(document.documentElement).not.toHaveClass("feed-scroll-padding");
    rerender(view("visible"));
    expect(document.documentElement).toHaveClass("feed-scroll-padding");
    expect(stories()).toHaveLength(2);
  });

  it("ignores a chosen ticker or source that the new feed does not have", async () => {
    const view = (f: Feed, mode: "visible" | "hidden" = "visible") => (
      <Activity mode={mode}>
        <FeedApp feed={f} firstName="Ann" signOutAction={vi.fn()} />
      </Activity>
    );
    const { rerender } = render(view(feed));
    fireEvent.click(pill("NVDA"));
    fireEvent.change(screen.getByRole("combobox", { name: "Source" }), {
      target: { value: "Company filing" },
    });

    // The watchlist changes while the route is hidden.
    const apple = await getFeed(["AAPL"], NOW);
    const next: Feed = {
      ...apple,
      stories: apple.stories.filter((s) => s.publisher !== "Company filing"),
    };
    rerender(view(feed, "hidden"));
    rerender(view(next));

    expect(stories()).toHaveLength(next.stories.length);
    expect(pill("All")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("combobox", { name: "Source" })).toHaveValue("");
    // Searching afterwards does not bring the stale choices back.
    fireEvent.change(search(), { target: { value: "example" } });
    expect(stories()).toHaveLength(next.stories.length);
  });
});
