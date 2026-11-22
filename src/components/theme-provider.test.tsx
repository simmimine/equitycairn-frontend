import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { ThemeProvider } from "./theme-provider";

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

describe("ThemeProvider", () => {
  afterEach(() => {
    cleanup();
    document.documentElement.className = "";
    localStorage.clear();
  });

  it("renders children", () => {
    render(
      <ThemeProvider>
        <p>hello</p>
      </ThemeProvider>,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("applies the .dark class when the stored theme is dark", () => {
    localStorage.setItem("theme", "dark");
    render(
      <ThemeProvider>
        <p>x</p>
      </ThemeProvider>,
    );
    expect(document.documentElement).toHaveClass("dark");
  });
});
