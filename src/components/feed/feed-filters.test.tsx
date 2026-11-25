import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { type Company, type FeedFilters, NO_FILTERS } from "@/lib/feed/types";

import { FeedFilterBar } from "./feed-filters";

const companies: Company[] = [
  { ticker: "AAPL", name: "Apple Inc." },
  { ticker: "ZZZZ", name: null },
];
const sources = ["Example Wire", "Sample Filings"];
const busy: FeedFilters = {
  ticker: "AAPL",
  time: "7d",
  source: "Example Wire",
  query: "chips",
};

function setup(filters: FeedFilters = NO_FILTERS, list = companies) {
  const onChange = vi.fn();
  render(
    <FeedFilterBar
      companies={list}
      sources={sources}
      filters={filters}
      onChange={onChange}
    />,
  );
  const group = screen.getByRole("group", { name: "Filter by company" });
  const pill = (name: string) => within(group).getByRole("button", { name });
  const select = (name: string) => screen.getByRole("combobox", { name });
  return { onChange, group, pill, select };
}

const options = (select: HTMLElement) =>
  within(select)
    .getAllByRole("option")
    .map((option) => option.textContent);

describe("FeedFilterBar", () => {
  it("presses All when no ticker is chosen", () => {
    const { pill } = setup();
    expect(pill("All")).toHaveAttribute("aria-pressed", "true");
    expect(pill("AAPL")).toHaveAttribute("aria-pressed", "false");
    expect(pill("ZZZZ")).toHaveAttribute("aria-pressed", "false");
  });

  it("presses only the chosen ticker", () => {
    const { pill } = setup(busy);
    expect(pill("AAPL")).toHaveAttribute("aria-pressed", "true");
    expect(pill("All")).toHaveAttribute("aria-pressed", "false");
  });

  it("picks a ticker, keeping the other filters", async () => {
    const { onChange, pill } = setup(busy);
    await userEvent.click(pill("ZZZZ"));
    expect(onChange).toHaveBeenCalledWith({ ...busy, ticker: "ZZZZ" });
  });

  it("clears the ticker with All", async () => {
    const { onChange, pill } = setup(busy);
    await userEvent.click(pill("All"));
    expect(onChange).toHaveBeenCalledWith({ ...busy, ticker: null });
  });

  it("offers the time ranges and sources, showing the current ones", () => {
    const { select } = setup(busy);
    expect(options(select("Time range"))).toEqual([
      "Any time",
      "Past 24 hours",
      "Past 7 days",
      "Past 30 days",
    ]);
    expect(options(select("Source"))).toEqual(["Any source", ...sources]);
    expect(select("Time range")).toHaveValue("7d");
    expect(select("Source")).toHaveValue("Example Wire");
  });

  it.each([
    ["Any time", "any"],
    ["Past 24 hours", "24h"],
    ["Past 30 days", "30d"],
  ])("emits %s as %s", async (label, time) => {
    const { onChange, select } = setup(busy);
    await userEvent.selectOptions(select("Time range"), label);
    expect(onChange).toHaveBeenCalledWith({ ...busy, time });
  });

  it("emits a chosen source", async () => {
    const { onChange, select } = setup();
    await userEvent.selectOptions(select("Source"), "Sample Filings");
    expect(onChange).toHaveBeenCalledWith({
      ...NO_FILTERS,
      source: "Sample Filings",
    });
  });

  it("emits null for Any source", async () => {
    const { onChange, select } = setup(busy);
    await userEvent.selectOptions(select("Source"), "Any source");
    expect(onChange).toHaveBeenCalledWith({ ...busy, source: null });
  });

  it("renders a 50-ticker watchlist", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      ticker: `T${i}`,
      name: null,
    }));
    const { group } = setup(NO_FILTERS, many);
    expect(within(group).getAllByRole("button")).toHaveLength(51);
  });

  it("mutes unselected pills and gives them the input border", () => {
    const { pill } = setup(busy);
    expect(pill("All")).toHaveClass("border-input", "text-muted-foreground");
    expect(pill("AAPL")).toHaveClass("border-primary", "bg-primary");
    expect(pill("AAPL")).not.toHaveClass("text-muted-foreground");
  });

  it.each(["Time range", "Source"])(
    "keeps the %s select at 16px on phones, muted",
    (name) => {
      const { select } = setup();
      expect(select(name)).toHaveClass(
        "text-base",
        "md:text-xs",
        "text-muted-foreground",
      );
    },
  );

  it.each([
    ["Time range", "Past 7 days"],
    ["Source", "Example Wire"],
  ])(
    "draws its own chevron on the %s select, after the chosen text",
    (name, label) => {
      const { select } = setup(busy);
      expect(select(name)).toHaveClass("appearance-none");
      const wrapper = select(name).parentElement!;
      // An invisible copy of the chosen label places the chevron.
      const face = wrapper.querySelector("[data-label]")!;
      expect(face).toHaveAttribute("data-label", label);
      expect(face).toHaveAttribute("aria-hidden", "true");
      expect(face).toHaveClass("pointer-events-none");
      expect(face.querySelector("svg.lucide-chevron-down")).not.toBeNull();
    },
  );

  it("labels the empty source choice Any source", () => {
    const { select } = setup();
    expect(
      select("Source").parentElement!.querySelector("[data-label]"),
    ).toHaveAttribute("data-label", "Any source");
  });
});
