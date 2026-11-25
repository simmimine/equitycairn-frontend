import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TickerChip } from "./ticker-chip";

describe("TickerChip", () => {
  it("shows the ticker on a 52x24 chip", () => {
    render(<TickerChip ticker="BRK.B" />);
    expect(screen.getByText("BRK.B")).toHaveClass(
      "h-6",
      "min-w-[52px]",
      "rounded-[7px]",
      "bg-secondary",
    );
  });
});
