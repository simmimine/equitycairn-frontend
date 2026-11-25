export function TickerChip({ ticker }: { ticker: string }) {
  return (
    <span className="flex h-6 min-w-[52px] shrink-0 items-center justify-center rounded-[7px] bg-secondary px-1.5 text-[11px] font-bold text-secondary-foreground">
      {ticker}
    </span>
  );
}
