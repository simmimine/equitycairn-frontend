import { cn } from "cn";

import { CONTAINER, SURFACE } from "@/components/brand/styles";

// Illustrative stories only: no real publishers, and every headline says "Example".
const STORIES = [
  {
    time: "09:42",
    headline: "Example coverage: company updates its services lineup",
    links: "3 related links",
  },
  {
    time: "09:18",
    headline: "Example coverage: a new platform draws interest",
    links: "1 sample link",
  },
];

export function SampleFeed() {
  return (
    <section
      id="product"
      aria-labelledby="product-title"
      className={cn(CONTAINER, "scroll-mt-20 pb-12")}
    >
      <h2 id="product-title" className="text-[17px] font-bold md:text-[22px]">
        <span className="md:hidden">A glimpse of the feed</span>
        <span className="hidden md:inline">A sample of the feed</span>
      </h2>
      <p className="mt-1.5 text-[11px] text-muted-foreground md:text-xs">
        <span className="md:hidden">
          Illustrative headline · sample publisher
        </span>
        <span className="hidden md:inline">
          Example stories show how ticker relevance and repeated coverage will
          appear.
        </span>
      </p>

      <div className={cn(SURFACE, "mt-4 overflow-hidden rounded-[15px]")}>
        <div className="flex items-center gap-3 px-3.5 pt-4 md:gap-10 md:bg-secondary md:px-[22px] md:py-3.5">
          <p className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-bold md:bg-transparent md:p-0">
            AAPL
          </p>
          <p className="hidden text-[11px] text-muted-foreground md:block">
            Illustrative stories · source names are placeholders
          </p>
          <p className="text-[11px] text-muted-foreground md:hidden">
            Example · 09:42
          </p>
        </div>
        <ul className="px-3.5 md:px-[22px]">
          {STORIES.map((story, index) => (
            <li
              key={story.headline}
              className={cn(
                "gap-4 py-3 md:grid md:grid-cols-[50px_1fr_auto] md:items-baseline md:py-5",
                // The phone board shows a single story.
                index > 0 && "hidden border-t",
              )}
            >
              <p className="hidden text-[11px] text-muted-foreground md:block">
                {story.time}
              </p>
              <p className="text-xs font-semibold md:text-[13px]">
                {story.headline}
              </p>
              <p className="mt-5 text-[11px] font-medium text-link md:mt-0 md:pr-24">
                <span className="md:hidden">
                  3 related sample links · Original story ↗
                </span>
                <span className="hidden md:inline">{story.links}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-6 text-[11px] text-muted-foreground md:hidden">
        Coverage and freshness vary by source.
      </p>
    </section>
  );
}
