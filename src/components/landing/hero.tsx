import { cn } from "cn";

import { CONTAINER, EYEBROW, SURFACE } from "@/components/brand/styles";
import { BetaCard } from "@/components/landing/beta-card";

const TILES = [
  { title: "Ticker first", text: "Follow the companies you care about." },
  { title: "Grouped coverage", text: "See repeated stories together." },
  { title: "Source context", text: "Keep publisher, time, and link visible." },
];

export function Hero() {
  return (
    <section
      className={cn(
        CONTAINER,
        // Copy beside the card from tablet up. The tiles run under both until
        // the left column is wide enough to hold them, as on the board.
        "grid items-start pt-7 pb-10 md:grid-cols-[596fr_672fr] md:gap-x-6 md:pt-12 lg:gap-x-11 xl:grid-rows-[auto_1fr]",
      )}
    >
      <div className="flex flex-col">
        <p className={EYEBROW}>
          <span className="md:hidden">Financial news for your watchlist</span>
          <span className="hidden md:inline">
            Financial news, focused on your watchlist
          </span>
        </p>
        <h1 className="mt-3 text-[27px] leading-[1.2] font-bold tracking-tight text-balance md:mt-6 md:max-w-[520px] md:text-wrap md:text-[28px] md:leading-[1.25] lg:text-[32px] xl:text-[39px]">
          Know what matters across your watchlist.
        </h1>
        <p className="mt-3 max-w-sm text-xs leading-relaxed text-muted-foreground md:mt-4 md:text-sm md:leading-relaxed">
          <span className="md:hidden">
            Relevant company coverage, grouped in one focused feed.
          </span>
          <span className="hidden md:inline">
            Follow companies and see relevant coverage grouped in one clean,
            focused feed.
          </span>
        </p>
        <p className="mt-4 text-[11px] font-medium text-muted-foreground md:hidden">
          Ticker-first · Source-linked · No investment advice
        </p>
        <p className="mt-7 hidden text-[13px] text-muted-foreground md:block">
          Less noise, clearer context, and the original source always in view.
        </p>
      </div>
      <BetaCard
        inputId="hero-email"
        id="join"
        className="mt-7 scroll-mt-24 md:col-start-2 md:row-start-1 md:mt-0 xl:row-span-2"
      />
      <ul
        aria-label="What you get"
        className="mt-8 hidden grid-cols-3 gap-4 md:col-span-2 md:grid xl:col-span-1 xl:col-start-1"
      >
        {TILES.map((tile) => (
          <li
            key={tile.title}
            className={cn(SURFACE, "rounded-xl px-3.5 py-4")}
          >
            <p className="text-xs font-bold">{tile.title}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {tile.text}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
