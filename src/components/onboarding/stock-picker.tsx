"use client";

import { PlusIcon, SearchIcon } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  CATEGORIES,
  MAX_PICKS,
  POPULAR_COMPANIES,
  filterCompanies,
  tickerCandidate,
  type Category,
} from "@/lib/onboarding/companies";

/** Search, category chips and selectable company cards (design step 4). */
export function StockPicker({
  selected,
  limited,
  onToggle,
}: {
  selected: readonly string[];
  /** True right after an add was refused because the list is full. */
  limited: boolean;
  onToggle: (ticker: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");

  function addCandidate(ticker: string) {
    onToggle(ticker);
    // When the list is full the add is refused: keep the text so it isn't silently lost.
    if (selected.length < MAX_PICKS) setQuery("");
  }

  const companies = filterCompanies(query, category);
  const candidate =
    category === "All" ? tickerCandidate(query, selected) : null;
  // Tickers added by hand (or saved earlier) have no card in the popular list, and the
  // watchlist panel is desktop-only, so show them here (under any category) to uncheck.
  const q = query.trim().toUpperCase();
  const custom = selected.filter(
    (t) => !POPULAR_COMPANIES.some((c) => c.ticker === t) && t.includes(q),
  );

  return (
    <div className="flex flex-col gap-5">
      <InputGroup className="h-[52px] rounded-xl bg-card">
        <InputGroupAddon>
          <SearchIcon aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          aria-label="Search companies"
          placeholder="Search by company name or ticker"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter in the search box must never submit the onboarding form
            // (that would finish onboarding); use it to add the offered ticker.
            if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
            e.preventDefault();
            // Enter is easy to hit mid-word ("ne" on the way to "netflix"), so it only
            // adds what is clearly a symbol: short, upper case or dotted, or text that
            // matches nothing in the list. Longer input needs the explicit Add button.
            const raw = query.trim();
            const symbolish =
              raw.includes(".") ||
              (raw.length <= 4 && raw === raw.toUpperCase());
            if (
              candidate &&
              (symbolish || (companies.length === 0 && raw.length <= 4))
            ) {
              addCandidate(candidate);
            }
          }}
        />
      </InputGroup>

      <ToggleGroup
        aria-label="Filter by category"
        variant="outline"
        spacing={2}
        className="flex-wrap"
        value={[category]}
        onValueChange={(v) => {
          // A single-select group reports [] when the pressed chip is clicked again.
          if (v.length > 0) setCategory(v[0] as Category);
        }}
      >
        {CATEGORIES.map((c) => (
          <ToggleGroupItem
            key={c}
            value={c}
            className="h-[34px] rounded-full px-4 aria-pressed:border-primary/40 aria-pressed:bg-secondary"
          >
            {c}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        <span>Popular companies</span>
        <span role="status" className="text-primary">
          {selected.length} selected
        </span>
      </div>

      {companies.length === 0 && custom.length === 0 && !candidate && (
        <p role="status" className="text-sm text-muted-foreground">
          No companies match your search.
        </p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {custom.map((ticker) => (
          <li key={ticker}>
            <FieldLabel>
              <Field
                orientation="horizontal"
                className="items-center gap-3 p-4"
              >
                <Avatar
                  aria-hidden="true"
                  className="size-11 rounded-xl after:hidden"
                >
                  <AvatarFallback className="rounded-xl bg-secondary text-sm font-bold text-secondary-foreground">
                    {ticker.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <FieldContent>
                  <FieldTitle>{ticker}</FieldTitle>
                  <FieldDescription className="text-xs">
                    Custom ticker
                  </FieldDescription>
                </FieldContent>
                <Checkbox
                  aria-label={`${ticker} (custom ticker)`}
                  checked
                  onCheckedChange={() => onToggle(ticker)}
                  className="size-[22px] rounded-full"
                />
              </Field>
            </FieldLabel>
          </li>
        ))}
        {companies.map((c) => {
          const checked = selected.includes(c.ticker);
          return (
            <li key={c.ticker}>
              <FieldLabel>
                <Field
                  orientation="horizontal"
                  className="items-center gap-3 p-4"
                >
                  <Avatar
                    aria-hidden="true"
                    className="size-11 rounded-xl after:hidden"
                  >
                    <AvatarFallback
                      className={`rounded-xl text-lg font-bold ${c.tone}`}
                    >
                      {c.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <FieldContent>
                    <FieldTitle>{c.name}</FieldTitle>
                    <FieldDescription className="text-xs">
                      {c.ticker} · {c.category}
                    </FieldDescription>
                  </FieldContent>
                  <Checkbox
                    aria-label={`${c.name} (${c.ticker})`}
                    checked={checked}
                    onCheckedChange={() => onToggle(c.ticker)}
                    className="size-[22px] rounded-full"
                  />
                </Field>
              </FieldLabel>
            </li>
          );
        })}
      </ul>

      {candidate && (
        <Button
          type="button"
          variant="outline"
          className="h-11 justify-start rounded-xl"
          onClick={() => addCandidate(candidate)}
        >
          <PlusIcon data-icon="inline-start" aria-hidden="true" />
          Add “{candidate}” to your watchlist
        </Button>
      )}

      {(limited || selected.length > MAX_PICKS) && (
        <p role="alert" className="text-sm text-destructive">
          You can follow up to {MAX_PICKS} companies.{" "}
          {selected.length > MAX_PICKS
            ? `You have ${selected.length} saved, so remove some to add more.`
            : "Remove one to add another."}
        </p>
      )}

      <p className="border-t pt-4 text-xs text-muted-foreground">
        You can edit your watchlist anytime from your feed.
      </p>
    </div>
  );
}
