"use client";

import { cn } from "cn";

import { SURFACE, TEXT_LINK } from "@/components/brand/styles";
import type { Company } from "@/lib/feed/types";

import { useComingSoon } from "./coming-soon";

export function ContextPanel({ companies }: { companies: Company[] }) {
  const comingSoon = useComingSoon();

  return (
    <aside
      aria-label="Coverage at a glance"
      className={cn(
        SURFACE,
        "hidden min-w-0 flex-col gap-4 rounded-[14px] p-[22px] md:flex",
      )}
    >
      <h2 className="text-[15px] font-bold">Coverage at a glance</h2>
      <p className="text-xs text-muted-foreground">
        Your feed follows the tickers you selected during onboarding.
      </p>
      <ul className="flex flex-col gap-2">
        {companies.map(({ ticker, name }) => (
          <li key={ticker} className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-6 min-w-[52px] shrink-0 items-center justify-center rounded-[7px] bg-secondary px-1.5 text-[11px] font-bold text-secondary-foreground">
              {ticker}
            </span>
            {name && (
              <span className="min-w-0 text-xs break-words">{name}</span>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={cn(
          TEXT_LINK,
          "rounded-sm text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
        onClick={() => comingSoon("Watchlist management")}
      >
        Manage watchlist <span aria-hidden="true">→</span>
      </button>
    </aside>
  );
}
