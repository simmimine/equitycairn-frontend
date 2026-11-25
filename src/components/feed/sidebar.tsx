"use client";

import { cn } from "cn";
import { Bookmark, Newspaper } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { Company } from "@/lib/feed/types";

import { UserInitial } from "./account-menu";
import { useComingSoon } from "./coming-soon";
import { FOCUS_RING } from "./styles";

const NAV_ITEM =
  "flex h-[2.625rem] shrink-0 items-center gap-3 rounded-[10px] px-3 text-left text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function Sidebar({
  companies,
  firstName,
}: {
  companies: Company[];
  firstName: string | null;
}) {
  const comingSoon = useComingSoon();
  const aside = useRef<HTMLElement>(null);
  const scrolls = useScrolls(aside);
  return (
    <aside
      ref={aside}
      aria-label="Sidebar"
      // The one scroll area, for short windows and long watchlists. Focusable
      // only then, so the keyboard can scroll it.
      tabIndex={scrolls ? 0 : undefined}
      className={cn(
        FOCUS_RING,
        // Below the header: 4.6875rem plus its 1px border (see AppHeader).
        "sticky hidden w-[13.75rem] shrink-0 flex-col gap-[26px] self-start overflow-y-auto border-r bg-card px-3 pt-[22px] focus-visible:ring-inset md:top-[calc(4.6875rem+1px)] md:flex md:h-[calc(100dvh-4.6875rem-1px)] lg:w-[16.25rem] lg:px-4",
      )}
    >
      <nav aria-label="Main" className="flex flex-col gap-2.5">
        <Link
          href="/feed"
          aria-current="page"
          className={cn(NAV_ITEM, "bg-secondary font-bold")}
        >
          <Newspaper className="size-4 text-link" />
          News feed
        </Link>
        <button
          type="button"
          onClick={() => comingSoon("Saved stories")}
          className={`${NAV_ITEM} text-muted-foreground hover:text-foreground`}
        >
          <Bookmark className="size-4" />
          Saved stories
        </button>
      </nav>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex h-4 items-center justify-between gap-2 px-3">
          <h2 className="text-[0.6875rem] font-bold tracking-wide whitespace-nowrap text-muted-foreground uppercase">
            Your watchlist
          </h2>
          <button
            type="button"
            aria-label="Manage watchlist"
            onClick={() => comingSoon("Watchlist management")}
            className={cn(
              FOCUS_RING,
              "-m-1 rounded-sm p-1 text-xs font-semibold text-link hover:underline",
            )}
          >
            Manage
          </button>
        </div>
        <ul aria-label="Your watchlist">
          {companies.map(({ ticker, name }) => (
            <li key={ticker} className="flex min-h-12 items-center gap-3 px-3">
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-link"
              >
                {ticker.charAt(0)}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-xs font-bold">{ticker}</span>
                {name && (
                  <span className="truncate text-xs text-muted-foreground">
                    {name}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {/* Stays in view while a long watchlist scrolls under it. */}
      <div className="sticky bottom-0 flex items-center gap-3 bg-card px-3 pt-4 pb-5">
        <UserInitial firstName={firstName} />
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-sm font-semibold">
            {firstName?.trim() || "Your account"}
          </p>
          <p className="text-xs whitespace-nowrap text-muted-foreground">
            Personal workspace
          </p>
        </div>
      </div>
    </aside>
  );
}

/** Whether the element has more content than fits, kept up to date. */
function useScrolls(ref: React.RefObject<HTMLElement | null>) {
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const element = ref.current!;
    const check = () => setScrolls(element.scrollHeight > element.clientHeight);
    check();
    // The window's height changes the box; the watchlist, its content.
    const observer = new ResizeObserver(check);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    return () => observer.disconnect();
  }, [ref]);
  return scrolls;
}
