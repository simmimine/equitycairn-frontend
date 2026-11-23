import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OnboardingStepper } from "./onboarding-stepper";

const LABELS = ["One", "Two", "Three"];

describe("OnboardingStepper", () => {
  it("marks the current step and completed steps", () => {
    render(<OnboardingStepper labels={LABELS} current={1} />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("One (completed)");
    expect(items[0]).not.toHaveAttribute("aria-current");
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[1]).toHaveTextContent("02");
    expect(items[2]).toHaveTextContent("03");
    expect(items[2]).not.toHaveTextContent("completed");
  });
});
