import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/login";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/onboarding/store";

// Placeholder for the watchlist newsfeed: ingestion and ranking are a separate feature.
export async function FeedContent() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile?.onboardedAt) redirect("/onboarding");

  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="text-base font-semibold tracking-tight">
            EquityCairn
          </span>
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            News for your watchlist
          </h1>
          {profile.tickers.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Your watchlist">
              {profile.tickers.map((ticker) => (
                <li key={ticker}>
                  <Badge variant="secondary">{ticker}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              {profile.tickers.length > 0
                ? "Stories are on their way"
                : "No companies yet"}
            </CardTitle>
            <CardDescription>
              {profile.tickers.length > 0
                ? "We're still connecting news sources. Matching stories for these companies will appear here."
                : "Add companies to follow and their news will appear here. Adding companies is coming soon."}
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    </>
  );
}
