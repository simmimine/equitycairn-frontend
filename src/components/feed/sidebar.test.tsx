import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Company } from "@/lib/feed/types";
import { stubMatchMedia, stubResizeObserver } from "@/test-utils/dom-stubs";

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

// jsdom has neither; the header, sidebar and tab bar use both.
beforeEach(() => {
  stubMatchMedia();
  stubResizeObserver();
});

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

  describe("scrolling", () => {
    const sidebar = () =>
      screen.getByRole("complementary", { name: "Sidebar" });
    /** Sets the sizes jsdom does not lay out. */
    const size = (scrollHeight: number, clientHeight = 300) => {
      Object.defineProperty(sidebar(), "scrollHeight", {
        value: scrollHeight,
        configurable: true,
      });
      Object.defineProperty(sidebar(), "clientHeight", {
        value: clientHeight,
        configurable: true,
      });
    };

    it("scrolls as one area: the watchlist does not scroll on its own", () => {
      renderSidebar();
      expect(sidebar()).toHaveClass("overflow-y-auto");
      expect(watchlist()).not.toHaveClass("overflow-y-auto");
      expect(watchlist()).not.toHaveAttribute("tabindex");
    });

    it("is a Tab stop only while it has something to scroll", () => {
      const observer = stubResizeObserver();
      renderSidebar();
      expect(sidebar()).not.toHaveAttribute("tabindex");
      size(900);
      observer.resize();
      expect(sidebar()).toHaveAttribute("tabindex", "0");
      expect(sidebar()).toHaveClass(
        "focus-visible:ring-3",
        "focus-visible:ring-inset",
      );
      size(300);
      observer.resize();
      expect(sidebar()).not.toHaveAttribute("tabindex");
    });

    it("watches the sidebar and each of its parts for size changes", () => {
      const observer = stubResizeObserver();
      const { unmount } = renderSidebar();
      // The profile's own height first, for the scroll padding.
      expect(observer.observed()).toEqual([
        sidebar().lastElementChild,
        sidebar(),
        ...Array.from(sidebar().children),
      ]);
      unmount();
      expect(observer.observed()).toEqual([]);
    });

    it("pads its scrolling by the profile's measured height", () => {
      const observer = stubResizeObserver();
      const height = vi
        .spyOn(HTMLElement.prototype, "getBoundingClientRect")
        .mockReturnValue({ height: 90 } as DOMRect);
      const root = document.documentElement.style;
      const { unmount } = renderSidebar();
      expect(sidebar()).toHaveClass(
        "scroll-pb-[calc(var(--feed-profile-height)+3px)]",
      );
      expect(root.getPropertyValue("--feed-profile-height")).toBe("90px");
      height.mockReturnValue({ height: 150 } as DOMRect);
      observer.resize();
      expect(root.getPropertyValue("--feed-profile-height")).toBe("150px");
      unmount();
      expect(root.getPropertyValue("--feed-profile-height")).toBe("");
      height.mockRestore();
    });

    it("keeps the profile at the bottom, over the rows scrolling under it", () => {
      renderSidebar();
      const profile =
        screen.getByText("Personal workspace").parentElement!.parentElement!;
      expect(profile).toHaveClass("sticky", "bottom-0", "bg-card");
    });
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
