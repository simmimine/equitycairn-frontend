import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Company } from "@/lib/feed/types";

import { ComingSoonProvider } from "./coming-soon";
import { Sidebar } from "./sidebar";

function renderSidebar(
  companies: Company[] = [{ ticker: "AAPL", name: "Apple Inc." }],
  firstName: string | null = "Ann",
) {
  return render(
    <ComingSoonProvider>
      <Sidebar companies={companies} firstName={firstName} />
    </ComingSoonProvider>,
  );
}

const watchlist = () => screen.getByRole("list", { name: "Your watchlist" });

describe("Sidebar", () => {
  it("marks the news feed as the current page", () => {
    renderSidebar();
    const nav = screen.getByRole("navigation", { name: "Main" });
    const link = within(nav).getByRole("link", { name: "News feed" });
    expect(link).toHaveAttribute("href", "/feed");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it.each([
    ["Saved stories", "Saved stories is coming soon."],
    ["Manage watchlist", "Watchlist management is coming soon."],
  ])("shows a notice for %s", (name, notice) => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name }));
    expect(screen.getByRole("status")).toHaveTextContent(notice);
  });

  it("lists each company with its initial, ticker and name", () => {
    renderSidebar();
    expect(
      screen.getByRole("heading", { name: "Your watchlist" }),
    ).toBeInTheDocument();
    const item = within(watchlist()).getByRole("listitem");
    expect(within(item).getByText("A")).toHaveAttribute("aria-hidden", "true");
    expect(within(item).getByText("AAPL")).toBeInTheDocument();
    expect(within(item).getByText("Apple Inc.")).toBeInTheDocument();
  });

  it("omits an unknown company name", () => {
    renderSidebar([{ ticker: "BRK.B", name: null }]);
    expect(within(watchlist()).getByRole("listitem").textContent).toBe(
      "BBRK.B",
    );
  });

  it("lists a 50-company watchlist", () => {
    renderSidebar(
      Array.from({ length: 50 }, (_, i) => ({ ticker: `T${i}`, name: null })),
    );
    expect(within(watchlist()).getAllByRole("listitem")).toHaveLength(50);
  });

  it("shows the profile", () => {
    renderSidebar([], "ann");
    expect(screen.getByText("ann")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("Personal workspace")).toBeInTheDocument();
  });

  it("still reads sensibly with no first name", () => {
    renderSidebar([], null);
    expect(screen.getByText("Your account")).toBeInTheDocument();
    expect(screen.getByText("Personal workspace")).toBeInTheDocument();
  });
});
