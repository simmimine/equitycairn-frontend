import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TickerChip } from "./ticker-chip";

describe("TickerChip", () => {
  it("shows the ticker on a 52x24 chip", () => {
    render(<TickerChip ticker="BRK.B" />);
    expect(screen.getByText("BRK.B")).toHaveClass(
      "min-h-6",
      "min-w-[3.25rem]",
      "rounded-[7px]",
      "bg-secondary",
    );
  });

  it("wraps a ticker too long for its container instead of overflowing", () => {
    render(<TickerChip ticker="ABCDEFGHIJKLMNOPQRSTUVWXYZ" />);
    expect(screen.getByText("ABCDEFGHIJKLMNOPQRSTUVWXYZ")).toHaveClass(
      "max-w-full",
      "break-all",
    );
  });
});
