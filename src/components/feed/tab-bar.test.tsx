import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { stubMatchMedia, stubResizeObserver } from "@/test-utils/dom-stubs";

import { ComingSoonProvider } from "./coming-soon";
import { TabBar } from "./tab-bar";

function renderTabBar() {
  return render(
    <ComingSoonProvider>
      <TabBar />
    </ComingSoonProvider>,
  );
}

const tabs = () => screen.getByRole("navigation", { name: "Tabs" });

// jsdom has neither; the header, sidebar and tab bar use both.
beforeEach(() => {
  stubMatchMedia();
  stubResizeObserver();
});

describe("TabBar", () => {
  it("publishes its height for the page's scroll padding", () => {
    const style = document.documentElement.style;
    const { unmount } = renderTabBar();
    // jsdom lays nothing out; the browser gives the real height.
    expect(style.getPropertyValue("--feed-tab-bar-height")).toBe("0px");
    unmount();
    expect(style.getPropertyValue("--feed-tab-bar-height")).toBe("");
  });

  it("marks the feed as the current page", () => {
    renderTabBar();
    const link = within(tabs()).getByRole("link", { name: "Feed" });
    expect(link).toHaveAttribute("href", "/feed");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("labels each tab beside a decorative icon", () => {
    renderTabBar();
    const items = [
      ...within(tabs()).getAllByRole("link"),
      ...within(tabs()).getAllByRole("button"),
    ];
    expect(items.map((item) => item.textContent)).toEqual([
      "Feed",
      "Watchlist",
      "Saved",
      "Profile",
    ]);
    for (const item of items) {
      expect(item.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    }
  });

  it.each([
    ["Watchlist", "Watchlist is coming soon."],
    ["Saved", "Saved stories is coming soon."],
    ["Profile", "Profile is coming soon."],
  ])("shows a notice for %s", (name, notice) => {
    renderTabBar();
    fireEvent.click(within(tabs()).getByRole("button", { name }));
    expect(screen.getByRole("status")).toHaveTextContent(notice);
  });

  it("marks the current tab with a bar, not only colour", () => {
    renderTabBar();
    const bar = '[data-slot="tab-indicator"]';
    const link = within(tabs()).getByRole("link", { name: "Feed" });
    expect(link.querySelector(bar)).toHaveAttribute("aria-hidden", "true");
    expect(tabs().querySelectorAll(bar)).toHaveLength(1);
  });
});
