import { XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MAX_PICKS, POPULAR_COMPANIES } from "@/lib/onboarding/companies";

function nameFor(ticker: string): string {
  return (
    POPULAR_COMPANIES.find((c) => c.ticker === ticker)?.name ?? "Custom ticker"
  );
}

/** Right-hand "Your watchlist" card (design step 4). */
export function WatchlistPanel({
  selected,
  onRemove,
}: {
  selected: readonly string[];
  onRemove: (ticker: string) => void;
}) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Your watchlist</h2>
          <span className="text-xs font-semibold text-primary tabular-nums">
            <span className="sr-only">
              {selected.length} of {MAX_PICKS} companies chosen
            </span>
            <span aria-hidden="true">
              {selected.length} / {MAX_PICKS}
            </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          Your starter feed will follow:
        </p>
        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No companies yet. Pick a few on the left.
          </p>
        ) : (
          <ScrollArea className="max-h-64">
            <ul>
              {selected.map((ticker, i) => (
                <li key={ticker}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center gap-3 py-3">
                    <Badge
                      variant="secondary"
                      className="h-7 rounded-md px-2 text-[10px] font-bold"
                    >
                      {ticker}
                    </Badge>
                    <span className="flex-1 truncate text-sm">
                      {nameFor(ticker)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Remove ${ticker}`}
                      onClick={() => onRemove(ticker)}
                    >
                      <XIcon aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
        <Separator />
        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
          <p className="text-sm font-semibold text-foreground">
            A focused start
          </p>
          <p>
            Follow a few companies to see relevant coverage in one place. You
            can update this anytime.
          </p>
        </div>
        <div className="rounded-xl border bg-background p-4 text-xs text-muted-foreground">
          EquityCairn organizes news and links to publishers. It doesn’t give
          advice.
        </div>
      </CardContent>
    </Card>
  );
}
