import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">EquityCairn</h1>
      <p className="text-muted-foreground">
        The market news that matters to your watchlist.
      </p>
      <Button disabled>Coming soon</Button>
    </main>
  );
}
