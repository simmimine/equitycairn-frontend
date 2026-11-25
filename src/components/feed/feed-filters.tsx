import { cn } from "cn";

import type { Company, FeedFilters, TimeRange } from "@/lib/feed/types";

const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "24h", label: "Past 24 hours" },
  { value: "7d", label: "Past 7 days" },
  { value: "30d", label: "Past 30 days" },
];

const FOCUS =
  "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const SELECT = cn(
  "h-8 max-w-full min-w-[120px] rounded-[10px] border border-input bg-card px-2 text-xs font-medium text-foreground",
  FOCUS,
);

function TickerPill({
  pressed,
  ...props
}: React.ComponentProps<"button"> & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "h-[29px] shrink-0 rounded-full border px-3.5 text-[11px] font-bold md:h-8 md:text-xs",
        pressed
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-foreground hover:bg-secondary",
        FOCUS,
      )}
      {...props}
    />
  );
}

export function FeedFilterBar({
  companies,
  sources,
  filters,
  onChange,
}: {
  companies: Company[];
  sources: string[];
  filters: FeedFilters;
  onChange: (next: FeedFilters) => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-start gap-3">
      <div
        role="group"
        aria-label="Filter by company"
        // The padding leaves room for focus rings inside the scrolling row.
        className="-m-1 flex max-w-[calc(100%+0.5rem)] min-w-0 grow gap-2 overflow-x-auto p-1 md:flex-wrap md:overflow-visible"
      >
        <TickerPill
          pressed={filters.ticker === null}
          onClick={() => onChange({ ...filters, ticker: null })}
        >
          All
        </TickerPill>
        {companies.map(({ ticker }) => (
          <TickerPill
            key={ticker}
            pressed={filters.ticker === ticker}
            onClick={() => onChange({ ...filters, ticker })}
          >
            {ticker}
          </TickerPill>
        ))}
      </div>
      <div className="flex max-w-full min-w-0 flex-wrap gap-2">
        <select
          aria-label="Time range"
          className={SELECT}
          value={filters.time}
          onChange={(event) =>
            onChange({ ...filters, time: event.target.value as TimeRange })
          }
        >
          {TIME_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Source"
          className={SELECT}
          value={filters.source ?? ""}
          onChange={(event) =>
            onChange({ ...filters, source: event.target.value || null })
          }
        >
          <option value="">Any source</option>
          {sources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
