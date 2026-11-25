import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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

describe("TabBar", () => {
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
});
