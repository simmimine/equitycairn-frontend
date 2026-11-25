import { useLayoutEffect } from "react";

/**
 * Keeps a CSS variable on <html> at the element's height (0 while not
 * displayed), for the page's scroll padding in globals.css. Measured rather
 * than assumed, so a larger font or a wrapped row is counted too.
 */
export function useHeightVariable(
  ref: React.RefObject<HTMLElement | null>,
  name: string,
) {
  // A layout effect, so a route hidden by Activity drops the variable too.
  useLayoutEffect(() => {
    const element = ref.current!;
    const root = document.documentElement;
    const update = () =>
      root.style.setProperty(
        name,
        `${element.getBoundingClientRect().height}px`,
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty(name);
    };
  }, [ref, name]);
}
