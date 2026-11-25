import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/login";
import { FeedApp } from "@/components/feed/feed-app";
import { requireUser } from "@/lib/auth/session";
import { getFeed } from "@/lib/feed/get-feed";
import { getProfile } from "@/lib/onboarding/store";

/** The watchlist newsfeed. Stories are mocked by `getFeed` until the backend exists. */
export async function FeedContent() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile?.onboardedAt) redirect("/onboarding");

  const feed = await getFeed(profile.tickers);
  return (
    <FeedApp
      feed={feed}
      firstName={profile.firstName}
      signOutAction={signOut}
    />
  );
}
