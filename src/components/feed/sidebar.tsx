"use client";

import { Bookmark, Newspaper } from "lucide-react";
import Link from "next/link";

import type { Company } from "@/lib/feed/types";

import { UserInitial } from "./account-menu";
import { useComingSoon } from "./coming-soon";

const NAV_ITEM =
  "flex h-[42px] shrink-0 items-center gap-3 rounded-[10px] px-3 text-left text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function Sidebar({
  companies,
  firstName,
}: {
  companies: Company[];
  firstName: string | null;
}) {
  const comingSoon = useComingSoon();
  return (
    <div className="sticky hidden w-[220px] shrink-0 flex-col gap-6 self-start overflow-y-auto border-r px-4 py-5 md:top-[76px] md:flex md:h-[calc(100dvh-76px)] lg:w-[260px]">
      <nav aria-label="Main" className="flex flex-col gap-1">
        <Link
          href="/feed"
          aria-current="page"
          className={`${NAV_ITEM} bg-secondary`}
        >
          <Newspaper className="size-4" />
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
      <div className="flex min-h-32 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-2 px-3">
          <h2 className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
            Your watchlist
          </h2>
          <button
            type="button"
            aria-label="Manage watchlist"
            onClick={() => comingSoon("Watchlist management")}
            className="text-xs font-semibold text-link hover:underline"
          >
            Manage
          </button>
        </div>
        <ul aria-label="Your watchlist" className="min-h-0 overflow-y-auto">
          {companies.map(({ ticker, name }) => (
            <li key={ticker} className="flex items-center gap-3 px-3 py-1.5">
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-bold"
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
      <div className="flex items-center gap-3 border-t px-3 pt-4">
        <UserInitial firstName={firstName} />
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-sm font-semibold">
            {firstName?.trim() || "Your account"}
          </p>
          <p className="text-xs text-muted-foreground">Personal workspace</p>
        </div>
      </div>
    </div>
  );
}
