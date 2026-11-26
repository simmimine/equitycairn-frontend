"use client";

import { Bookmark, List, Newspaper, User } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import { useComingSoon } from "./coming-soon";
import { useHeightVariable } from "./use-height-variable";

const TAB =
  "flex flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset";

const SOON_TABS = [
  { label: "Watchlist", feature: "Watchlist", Icon: List },
  { label: "Saved", feature: "Saved stories", Icon: Bookmark },
];

/** Marks the current tab without relying on colour. */
function Indicator() {
  return (
    <span
      aria-hidden="true"
      data-slot="tab-indicator"
      className="absolute top-0 h-[3px] w-6 rounded-b-full bg-link"
    />
  );
}

export function TabBar({ current = "feed" }: { current?: "feed" | "profile" }) {
  const comingSoon = useComingSoon();
  const nav = useRef<HTMLElement>(null);
  // For the page's scroll padding (globals.css); 0 from `md`, where it is
  // not displayed.
  useHeightVariable(nav, "--feed-tab-bar-height");
  return (
    <nav
      ref={nav}
      aria-label="Tabs"
      className="fixed inset-x-0 bottom-0 z-20 flex h-[calc(4.125rem+env(safe-area-inset-bottom))] border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <Link
        href="/feed"
        aria-current={current === "feed" ? "page" : undefined}
        className={`${TAB} relative ${current === "feed" ? "text-link" : "text-muted-foreground"}`}
      >
        {current === "feed" && <Indicator />}
        <Newspaper className="size-5" />
        Feed
      </Link>
      {SOON_TABS.map(({ label, feature, Icon }) => (
        <button
          key={label}
          type="button"
          onClick={() => comingSoon(feature)}
          className={`${TAB} text-muted-foreground`}
        >
          <Icon className="size-5" />
          {label}
        </button>
      ))}
      <Link
        // On settings, a repeat tap keeps the page the user first came from.
        href={current === "profile" ? "/settings" : "/settings?from=/feed"}
        aria-current={current === "profile" ? "page" : undefined}
        className={`${TAB} relative ${current === "profile" ? "text-link" : "text-muted-foreground"}`}
      >
        {current === "profile" && <Indicator />}
        <User className="size-5" />
        Profile
      </Link>
    </nav>
  );
}
