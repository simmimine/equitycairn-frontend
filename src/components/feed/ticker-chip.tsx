export function TickerChip({ ticker }: { ticker: string }) {
  return (
    <span className="flex min-h-6 max-w-full min-w-[52px] shrink-0 items-center break-all justify-center rounded-[7px] bg-secondary px-1.5 text-center text-[11px] font-bold text-secondary-foreground">
      {ticker}
    </span>
  );
}
