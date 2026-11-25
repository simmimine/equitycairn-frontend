import { cn } from "cn";
import { ChevronDown } from "lucide-react";

import type { Company, FeedFilters, TimeRange } from "@/lib/feed/types";

const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "24h", label: "Past 24 hours" },
  { value: "7d", label: "Past 7 days" },
  { value: "30d", label: "Past 30 days" },
];

const FOCUS =
  "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// 16px below `md`, or iOS zooms in on focus.
const SELECT_TEXT = "text-base font-medium md:text-xs";

/**
 * A native select with its chevron right after the chosen text. A native select
 * is as wide as its longest option, so an invisible copy of the chosen label
 * sets the width and places the icon, and the select is stretched over it.
 */
function FilterSelect({
  options,
  value,
  ...props
}: Omit<React.ComponentProps<"select">, "children"> & {
  options: { value: string; label: string }[];
  value: string;
}) {
  return (
    <div className="relative h-8 max-w-full min-w-[120px]">
      <select
        value={value}
        className={cn(
          "absolute inset-0 w-full appearance-none rounded-[10px] border border-input bg-card pr-2 pl-3 text-muted-foreground",
          SELECT_TEXT,
          FOCUS,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        data-label={options.find((option) => option.value === value)?.label}
        // The border keeps the copy's text in line with the select's.
        className={cn(
          "pointer-events-none relative flex h-full items-center gap-1.5 overflow-hidden border border-transparent px-3 whitespace-pre text-muted-foreground before:invisible before:content-[attr(data-label)]",
          SELECT_TEXT,
        )}
      >
        <ChevronDown className="size-3.5 shrink-0" />
      </span>
    </div>
  );
}

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
          : "border-input bg-card text-muted-foreground hover:bg-secondary",
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
        <FilterSelect
          aria-label="Time range"
          options={TIME_OPTIONS}
          value={filters.time}
          onChange={(event) =>
            onChange({ ...filters, time: event.target.value as TimeRange })
          }
        />
        <FilterSelect
          aria-label="Source"
          options={[
            { value: "", label: "Any source" },
            ...sources.map((source) => ({ value: source, label: source })),
          ]}
          value={filters.source ?? ""}
          onChange={(event) =>
            onChange({ ...filters, source: event.target.value || null })
          }
        />
      </div>
    </div>
  );
}
