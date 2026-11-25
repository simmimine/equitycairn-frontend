import { cn } from "cn";

import { EYEBROW, SURFACE } from "@/components/brand/styles";
import { BetaCard } from "@/components/landing/beta-card";

const TILES = [
  { title: "Ticker first", text: "Follow the companies you care about." },
  { title: "Grouped coverage", text: "See repeated stories together." },
  { title: "Source context", text: "Keep publisher, time, and link visible." },
];

export function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-[1440px] items-start gap-5 px-5 pt-7 pb-10 md:px-8 md:pt-12 lg:grid-cols-[596fr_672fr] lg:gap-11 lg:px-16">
      <div className="flex flex-col">
        <p className={EYEBROW}>
          <span className="md:hidden">Financial news for your watchlist</span>
          <span className="hidden md:inline">
            Financial news, focused on your watchlist
          </span>
        </p>
        <h1 className="mt-3 text-[27px] leading-[1.2] font-bold tracking-tight text-balance md:mt-6 md:max-w-[520px] md:text-wrap md:text-[39px] md:leading-[1.25]">
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
        <ul
          aria-label="What you get"
          className="mt-8 hidden grid-cols-3 gap-4 md:grid"
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
      </div>
      <BetaCard
        inputId="hero-email"
        id="join"
        className="mt-2 scroll-mt-24 lg:mt-0"
      />
    </section>
  );
}
