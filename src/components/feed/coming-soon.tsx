"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
}: {
  children: React.ReactNode;
}) {
  // The id re-inserts the text on a repeat call, so it is announced again.
  const [notice, setNotice] = useState<{ feature: string; id: number } | null>(
    null,
  );
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const calls = useRef(0);

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setNotice(null);
  }, []);

  const comingSoon = useCallback(
    (feature: string) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(dismiss, HIDE_AFTER_MS);
      setNotice({ feature, id: ++calls.current });
    },
    [dismiss],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ComingSoonContext value={comingSoon}>
      {children}
      <div
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(66px+env(safe-area-inset-bottom)+12px)] z-40 flex justify-center px-5 md:bottom-6"
      >
        {notice && (
          <div
            key={notice.id}
            className="pointer-events-auto flex items-center gap-3 rounded-[14px] border bg-popover py-2 pr-2 pl-4 text-sm text-popover-foreground shadow-lg"
          >
            <p>{notice.feature} is coming soon.</p>
            <Button variant="ghost" onClick={dismiss}>
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </ComingSoonContext>
  );
}
