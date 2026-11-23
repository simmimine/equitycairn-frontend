import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OptionCards } from "./option-cards";

describe("OptionCards", () => {
  it("names each group by its legend, even with spaces and punctuation", () => {
    render(
      <>
        <OptionCards
          legend="What best describes your role?"
          options={[["a", "A"]]}
          value=""
          onValueChange={() => {}}
        />
        <OptionCards
          legend="How would you describe your experience?"
          options={[["b", "B"]]}
          value=""
          onValueChange={() => {}}
        />
      </>,
    );
    expect(
      screen.getByRole("radiogroup", {
        name: "What best describes your role?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", {
        name: "How would you describe your experience?",
      }),
    ).toBeInTheDocument();
  });
});
