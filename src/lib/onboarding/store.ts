import "server-only";

import { createSessionClient } from "@/lib/auth/session";

import type { Experience, Role } from "./schema";

export type Profile = {
  firstName: string | null;
  lastName: string | null;
  role: Role | null;
  experience: Experience | null;
  onboardedAt: string | null;
  tickers: string[];
};

type DbError = { message: string } | null;

function check(context: string, error: DbError) {
  if (error) throw new Error(`onboarding store: ${context}: ${error.message}`);
}

// All access goes through the user's own session, so RLS limits it to their rows.

export async function getProfile(userId: string): Promise<Profile | null> {
  const db = await createSessionClient();
  const { data, error } = await db
    .from("profiles")
    .select("first_name,last_name,role,experience,onboarded_at")
    .eq("user_id", userId)
    .maybeSingle();
  check("get profile", error);
  if (!data) return null;

  const list = await db
    .from("watchlist_items")
    .select("ticker")
    .eq("user_id", userId)
    .order("ticker");
  check("get watchlist", list.error);

  return {
    firstName: data.first_name,
    lastName: data.last_name,
    role: data.role,
    experience: data.experience,
    onboardedAt: data.onboarded_at,
    tickers: ((list.data ?? []) as { ticker: string }[]).map((r) => r.ticker),
  };
}

export async function saveName(userId: string, first: string, last: string) {
  const db = await createSessionClient();
  const { error } = await db
    .from("profiles")
    .upsert(
      { user_id: userId, first_name: first, last_name: last },
      { onConflict: "user_id" },
    );
  check("save name", error);
}

export async function saveAbout(
  userId: string,
  role: Role | null,
  experience: Experience | null,
) {
  const db = await createSessionClient();
  const { error } = await db
    .from("profiles")
    .update({ role, experience })
    .eq("user_id", userId);
  check("save about", error);
}

/**
 * Replaces the user's watchlist. Dropped tickers go first so swapping a full
 * list never trips the 50-item cap; then the new ones are added.
 */
export async function saveWatchlist(userId: string, tickers: string[]) {
  const db = await createSessionClient();
  let removal = db.from("watchlist_items").delete().eq("user_id", userId);
  if (tickers.length > 0) {
    // Tickers are validated to [A-Z.]{1,6}, so the list is safe to inline.
    removal = removal.not("ticker", "in", `(${tickers.join(",")})`);
  }
  const removed = await removal;
  check("trim watchlist", removed.error);

  if (tickers.length > 0) {
    const added = await db.from("watchlist_items").upsert(
      tickers.map((ticker) => ({ user_id: userId, ticker })),
      { onConflict: "user_id,ticker", ignoreDuplicates: true },
    );
    check("add watchlist", added.error);
  }
}

export async function markOnboarded(userId: string) {
  const db = await createSessionClient();
  const { error } = await db
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("user_id", userId);
  check("mark onboarded", error);
}
