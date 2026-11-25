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

  it("is a named complementary landmark", () => {
    renderSidebar();
    const aside = screen.getByRole("complementary", { name: "Sidebar" });
    expect(aside).toContainElement(screen.getByRole("navigation"));
    expect(aside).toContainElement(watchlist());
  });

  it("lets the keyboard reach the scrolling watchlist", () => {
    renderSidebar();
    expect(watchlist()).toHaveAttribute("tabindex", "0");
    expect(watchlist()).toHaveClass("focus-visible:ring-3");
  });

  it("draws round link-coloured markers and avatar", () => {
    renderSidebar([{ ticker: "KO", name: null }]);
    expect(screen.getByText("K")).toHaveClass(
      "size-7",
      "rounded-full",
      "text-link",
    );
    expect(screen.getByText("A")).toHaveClass("bg-secondary", "text-link");
  });

  it("gives Manage a focus ring and a 24px target", () => {
    renderSidebar();
    expect(
      screen.getByRole("button", { name: "Manage watchlist" }),
    ).toHaveClass("focus-visible:ring-3", "p-1", "-m-1");
  });

  it("is a card surface with no line above the profile", () => {
    renderSidebar();
    expect(screen.getByRole("complementary")).toHaveClass("bg-card");
    expect(
      screen.getByText("Personal workspace").parentElement!.parentElement,
    ).not.toHaveClass("border-t");
  });

  it("marks the active item with a link-coloured icon and bold label", () => {
    renderSidebar();
    const link = screen.getByRole("link", { name: "News feed" });
    expect(link).toHaveClass("bg-secondary", "font-bold");
    expect(link).not.toHaveClass("font-medium");
    expect(link.querySelector("svg")).toHaveClass("text-link");
  });
});
