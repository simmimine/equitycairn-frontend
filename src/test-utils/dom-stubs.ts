import { act } from "@testing-library/react";
import { vi } from "vitest";

type MediaListener = (event: { matches: boolean; media: string }) => void;

/**
 * A `matchMedia` whose answers the test sets; `set` sends `change` to the
 * listeners of that query. Undo with `vi.unstubAllGlobals()`.
 */
export function stubMatchMedia(initial: Record<string, boolean> = {}) {
  const matches = { ...initial };
  const listeners = new Map<string, Set<MediaListener>>();
  const on = (media: string) => {
    if (!listeners.has(media)) listeners.set(media, new Set());
    return listeners.get(media)!;
  };
  vi.stubGlobal("matchMedia", (media: string) => ({
    media,
    get matches() {
      return matches[media] ?? false;
    },
    addEventListener: (_: "change", listener: MediaListener) =>
      on(media).add(listener),
    removeEventListener: (_: "change", listener: MediaListener) =>
      on(media).delete(listener),
  }));
  return {
    set(media: string, value: boolean) {
      matches[media] = value;
      act(() => {
        for (const listener of on(media)) listener({ matches: value, media });
      });
    },
    listeners: (media: string) => on(media).size,
  };
}

/**
 * A `ResizeObserver` the test triggers with `resize()`. Undo with
 * `vi.unstubAllGlobals()`.
 */
export function stubResizeObserver() {
  const live = new Set<{ callback: () => void; targets: Set<Element> }>();
  class FakeResizeObserver {
    private entry: { callback: () => void; targets: Set<Element> };
    constructor(callback: () => void) {
      this.entry = { callback, targets: new Set() };
      live.add(this.entry);
    }
    observe(target: Element) {
      this.entry.targets.add(target);
    }
    disconnect() {
      live.delete(this.entry);
    }
  }
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  return {
    resize() {
      act(() => {
        for (const { callback } of live) callback();
      });
    },
    observed: () => [...live].flatMap(({ targets }) => [...targets]),
  };
}
