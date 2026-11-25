import { render } from "@testing-library/react";
import { Activity, useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubResizeObserver } from "@/test-utils/dom-stubs";

import { useHeightVariable } from "./use-height-variable";

const NAME = "--test-height";
const root = document.documentElement;
const value = () => root.style.getPropertyValue(NAME);

function Box() {
  const ref = useRef<HTMLDivElement>(null);
  useHeightVariable(ref, NAME);
  return <div ref={ref} data-testid="box" />;
}

function setHeight(element: Element, height: number) {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    height,
  } as DOMRect);
}

afterEach(() => {
  vi.restoreAllMocks();
  root.style.removeProperty(NAME);
});

describe("useHeightVariable", () => {
  it("sets the variable to the element's height, and keeps it there", () => {
    const observer = stubResizeObserver();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      height: 64.5,
    } as DOMRect);
    const { getByTestId } = render(<Box />);
    expect(value()).toBe("64.5px");
    expect(observer.observed()).toEqual([getByTestId("box")]);
    setHeight(getByTestId("box"), 118);
    observer.resize();
    expect(value()).toBe("118px");
  });

  it("removes the variable on unmount, or when a hidden route hides it", () => {
    const observer = stubResizeObserver();
    const view = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <Box />
      </Activity>
    );
    const { rerender, unmount } = render(view("visible"));
    expect(value()).toBe("0px");
    rerender(view("hidden"));
    expect(value()).toBe("");
    expect(observer.observed()).toEqual([]);
    rerender(view("visible"));
    expect(value()).toBe("0px");
    unmount();
    expect(value()).toBe("");
  });
});
