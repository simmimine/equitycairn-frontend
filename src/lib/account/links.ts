import "server-only";

import { ACCOUNT_LINK_TTL_MINUTES } from "@/lib/auth/constants";
import { generateToken, hashToken } from "@/lib/signup/tokens";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type LinkPurpose = "password_change" | "account_delete";

const TABLE = "account_action_tokens";

export type UsedLink = { userId: string; expiresAt: string };

function check(context: string, error: { message: string } | null) {
  if (error) throw new Error(`account links: ${context}: ${error.message}`);
}

/** Stores a new one-time link, replacing the user's previous one for this purpose. */
export async function issueLink(
  userId: string,
  purpose: LinkPurpose,
  now = new Date(),
): Promise<string> {
  const { raw, hash } = generateToken();
  const expires = new Date(now.getTime() + ACCOUNT_LINK_TTL_MINUTES * 60_000);
  const { error } = await getSupabaseAdmin().from(TABLE).upsert(
    {
      user_id: userId,
      purpose,
      token_hash: hash,
      expires_at: expires.toISOString(),
    },
    { onConflict: "user_id,purpose" },
  );
  check("issue", error);
  return raw;
}

/** What a live link is for, without using it up. */
export async function peekLink(
  raw: string,
  now = new Date(),
): Promise<{ userId: string; purpose: LinkPurpose } | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select("user_id,purpose")
    .eq("token_hash", hashToken(raw))
    .gt("expires_at", now.toISOString())
    .maybeSingle();
  check("peek", error);
  const row = data as { user_id: string; purpose: LinkPurpose } | null;
  return row ? { userId: row.user_id, purpose: row.purpose } : null;
}

/** Uses a link up. One statement, so only one of two concurrent calls gets the row. */
export async function consumeLink(
  raw: string,
  purpose: LinkPurpose,
  now = new Date(),
): Promise<UsedLink | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .delete()
    .eq("token_hash", hashToken(raw))
    .eq("purpose", purpose)
    .gt("expires_at", now.toISOString())
    .select("user_id,expires_at");
  check("consume", error);
  const row = (data as { user_id: string; expires_at: string }[] | null)?.[0];
  return row ? { userId: row.user_id, expiresAt: row.expires_at } : null;
}

/**
 * Gives back a used link whose action changed nothing, with its original expiry.
 * An insert, so a link requested in the meantime is not overwritten.
 */
export async function restoreLink(
  raw: string,
  purpose: LinkPurpose,
  { userId, expiresAt }: UsedLink,
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from(TABLE)
    .insert({
      user_id: userId,
      purpose,
      token_hash: hashToken(raw),
      expires_at: expiresAt,
    });
  // 23505: the user already has a newer link for this.
  if (error && (error as { code?: string }).code !== "23505") {
    check("restore", error);
  }
}
