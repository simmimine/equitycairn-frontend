"use client";

import { Bookmark, List, Newspaper, User } from "lucide-react";
import Link from "next/link";

import { useComingSoon } from "./coming-soon";

const TAB =
  "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset";

const SOON_TABS = [
  { label: "Watchlist", feature: "Watchlist", Icon: List },
  { label: "Saved", feature: "Saved stories", Icon: Bookmark },
  { label: "Profile", feature: "Profile", Icon: User },
];

export function TabBar() {
  const comingSoon = useComingSoon();
  return (
    <nav
      aria-label="Tabs"
      className="fixed inset-x-0 bottom-0 z-20 flex h-[calc(66px+env(safe-area-inset-bottom))] border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <Link
        href="/feed"
        aria-current="page"
        className={`${TAB} relative text-link`}
      >
        {/* Marks the current tab without relying on colour. */}
        <span
          aria-hidden="true"
          data-slot="tab-indicator"
          className="absolute top-0 h-[3px] w-6 rounded-b-full bg-link"
        />
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
    </nav>
  );
}
