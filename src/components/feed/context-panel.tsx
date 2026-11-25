"use client";

import { cn } from "cn";

import { SURFACE, TEXT_LINK } from "@/components/brand/styles";
import type { Company } from "@/lib/feed/types";

import { useComingSoon } from "./coming-soon";
import { FOCUS_RING } from "./styles";
import { TickerChip } from "./ticker-chip";

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
      <h2 className="text-base font-bold">Coverage at a glance</h2>
      <p className="text-xs text-muted-foreground">
        Your feed follows the tickers you selected during onboarding.
      </p>
      <ul className="flex flex-col gap-2">
        {companies.map(({ ticker, name }) => (
          <li key={ticker} className="flex min-w-0 items-center gap-2.5">
            <TickerChip ticker={ticker} />
            {name && (
              <span className="min-w-0 text-xs break-words">{name}</span>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={cn(TEXT_LINK, FOCUS_RING, "-my-1 rounded-sm py-1 text-xs")}
        onClick={() => comingSoon("Watchlist management")}
      >
        Manage watchlist <span aria-hidden="true">→</span>
      </button>
    </aside>
  );
}
