"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";

const HIDE_AFTER_MS = 4000;

const ComingSoonContext = createContext<((feature: string) => void) | null>(
  null,
);

/** Says that a control the designs show is not built yet. */
export function useComingSoon() {
  const comingSoon = useContext(ComingSoonContext);
  if (!comingSoon) {
    throw new Error("useComingSoon needs a ComingSoonProvider");
  }
  return comingSoon;
}

export function ComingSoonProvider({
  children,
  fallbackRef,
}: {
  children: React.ReactNode;
  /** Takes focus when the control that opened a notice no longer can. */
  fallbackRef?: React.RefObject<HTMLElement | null>;
}) {
  // The id re-inserts the text on a repeat call, so it is announced again.
  const [notice, setNotice] = useState<{ feature: string; id: number } | null>(
    null,
  );
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const calls = useRef(0);
  // The notice stays while the pointer is over it or focus is inside it.
  const held = useRef({ hover: false, focus: false });

  // The control that asked for the notice, where focus goes back to.
  const opener = useRef<Element | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    // A removed element sends no leave or blur event.
    held.current = { hover: false, focus: false };
    setNotice(null);
  }, []);

  /**
   * Dismisses, first returning focus from inside the notice to its opener, or
   * to the fallback if the opener has since been removed or hidden. A pointer
   * click leaves the page where it is; the keyboard scrolls to the focus.
   */
  const hide = useCallback(
    (preventScroll = false) => {
      const target = opener.current;
      if (box.current?.contains(document.activeElement)) {
        // Before dismissing: the blur this sends would restart the timer.
        if (target instanceof HTMLElement) target.focus({ preventScroll });
        // A removed or display:none element does not take focus.
        if (document.activeElement !== target) {
          fallbackRef?.current?.focus({ preventScroll });
        }
      }
      dismiss();
    },
    [dismiss, fallbackRef],
  );

  const restartTimer = useCallback(() => {
    clearTimeout(timer.current);
    if (held.current.hover || held.current.focus) return;
    timer.current = setTimeout(() => hide(), HIDE_AFTER_MS);
  }, [hide]);

  const hold = useCallback(
    (by: "hover" | "focus", on: boolean) => {
      held.current[by] = on;
      restartTimer();
    },
    [restartTimer],
  );

  const comingSoon = useCallback(
    (feature: string) => {
      if (!box.current?.contains(document.activeElement)) {
        opener.current = document.activeElement;
      }
      restartTimer();
      setNotice({ feature, id: ++calls.current });
    },
    [restartTimer],
  );

  // Runs on unmount and when Activity hides the route, which keeps state:
  // without clearing both, the notice would come back and never hide.
  useLayoutEffect(() => dismiss, [dismiss]);

  // Escape closes the notice wherever focus is. It runs first (capture on
  // window) and marks the key handled, so the search field leaves its text.
  const shown = notice !== null;
  useEffect(() => {
    if (!shown) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      hide();
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [shown, hide]);

  return (
    <ComingSoonContext value={comingSoon}>
      {children}
      <div
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4.125rem+env(safe-area-inset-bottom)+0.75rem)] z-40 flex justify-center px-5 md:bottom-6"
      >
        {notice && (
          <div
            ref={box}
            onPointerEnter={() => hold("hover", true)}
            onPointerLeave={() => hold("hover", false)}
            onFocus={() => hold("focus", true)}
            onBlur={() => hold("focus", false)}
            className="pointer-events-auto flex items-center gap-3 rounded-[14px] border bg-popover py-2 pr-2 pl-4 text-sm text-popover-foreground shadow-lg"
          >
            <p key={notice.id}>{notice.feature} is coming soon.</p>
            <Button
              variant="ghost"
              // A click from the keyboard has no click count.
              onClick={(event) => hide(event.detail > 0)}
            >
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </ComingSoonContext>
  );
}
