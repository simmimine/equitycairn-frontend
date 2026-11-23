import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

import { COOLDOWN_SECONDS, VERIFY_TTL_HOURS } from "./constants";
import { generateToken, hashToken } from "./tokens";

const TABLE = "beta_signups";

type DbError = { code?: string; message: string };

function fail(context: string, error: DbError): never {
  throw new Error(`signup store: ${context}: ${error.message}`);
}

function cooldownCutoff(now: Date): string {
  return new Date(now.getTime() - COOLDOWN_SECONDS * 1000).toISOString();
}

function remainingSeconds(lastSent: string | null, now: Date): number {
  if (!lastSent) return 0;
  const endsAt = new Date(lastSent).getTime() + COOLDOWN_SECONDS * 1000;
  if (endsAt <= now.getTime()) return 0;
  return Math.min(COOLDOWN_SECONDS, Math.ceil((endsAt - now.getTime()) / 1000));
}

function verifyFields(now: Date) {
  const token = generateToken();
  return {
    token,
    fields: {
      verify_token_hash: token.hash,
      verify_expires_at: new Date(
        now.getTime() + VERIFY_TTL_HOURS * 3600 * 1000,
      ).toISOString(),
      last_email_sent_at: now.toISOString(),
    },
  };
}

export async function checkSignupRateLimit(
  key: string,
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  const { data, error } = await getSupabaseAdmin().rpc(
    "check_signup_rate_limit",
    { p_key: key, p_window_seconds: COOLDOWN_SECONDS },
  );
  if (error) fail("rate limit", error);
  if (typeof data !== "number") fail("rate limit", { message: "bad result" });
  return data === 0
    ? { allowed: true }
    : { allowed: false, retryAfterSeconds: data };
}

/**
 * Atomically rotate the verify token on the row matched by `column = hash`,
 * only if it is unverified and out of cooldown. Returns the raw token, or
 * null if no row qualified.
 */
async function issueVerifyToken(
  column: "manage_token_hash" | "id",
  value: string | number,
  now: Date,
): Promise<string | null> {
  const { token, fields } = verifyFields(now);
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .update(fields)
    .eq(column, value)
    .is("verified_at", null)
    .or(
      `last_email_sent_at.is.null,last_email_sent_at.lte.${cooldownCutoff(now)}`,
    )
    .select("id");
  if (error) fail("issue verify token", error);
  return Array.isArray(data) && data.length === 1 ? token.raw : null;
}

/**
 * Restart the cooldown without issuing a token, if it has elapsed. Used for
 * verified rows so their timing matches unverified rows. Returns whether the
 * bump happened.
 */
async function bumpCooldown(
  column: "manage_token_hash" | "id",
  value: string | number,
  now: Date,
): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .update({ last_email_sent_at: now.toISOString() })
    .eq(column, value)
    .or(
      `last_email_sent_at.is.null,last_email_sent_at.lte.${cooldownCutoff(now)}`,
    )
    .select("id");
  if (error) fail("bump cooldown", error);
  return Array.isArray(data) && data.length === 1;
}

export async function registerSignup(
  email: string,
): Promise<{ manageToken: string; verifyToken: string | null }> {
  const address = email.trim().toLowerCase();
  const now = new Date();
  const manage = generateToken();
  const verify = verifyFields(now);
  const db = getSupabaseAdmin();

  const { error } = await db.from(TABLE).insert({
    email: address,
    source: "landing",
    manage_token_hash: manage.hash,
    ...verify.fields,
  });
  if (!error) {
    return { manageToken: manage.raw, verifyToken: verify.token.raw };
  }
  if (error.code !== "23505") fail("insert", error);

  const { data: existing, error: findError } = await db
    .from(TABLE)
    .select("id")
    .eq("email", address)
    .maybeSingle();
  if (findError) fail("find existing", findError);
  if (!existing) fail("find existing", { message: "row not found" });
  const id = (existing as { id: number }).id;

  const { data: updated, error: updateError } = await db
    .from(TABLE)
    .update({ manage_token_hash: manage.hash })
    .eq("id", id)
    .select("id");
  if (updateError) fail("rotate manage token", updateError);
  if (!Array.isArray(updated) || updated.length !== 1) {
    fail("rotate manage token", { message: "row not found" });
  }

  const verifyToken = await issueVerifyToken("id", id, now);
  // A verified row never gets a token, but its cooldown must behave exactly
  // like an unverified row's so timing does not reveal verification state.
  if (!verifyToken) await bumpCooldown("id", id, now);
  return { manageToken: manage.raw, verifyToken };
}

type StatusRow = {
  verified_at: string | null;
  last_email_sent_at: string | null;
};

async function findByManageHash(hash: string): Promise<StatusRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select("verified_at,last_email_sent_at")
    .eq("manage_token_hash", hash)
    .maybeSingle();
  if (error) fail("find by manage token", error);
  return (data as StatusRow | null) ?? null;
}

export async function getSignupStatus(
  rawManageToken: string,
): Promise<{ cooldownRemainingSeconds: number } | null> {
  const row = await findByManageHash(hashToken(rawManageToken));
  if (!row) return null;
  return {
    cooldownRemainingSeconds: remainingSeconds(
      row.last_email_sent_at,
      new Date(),
    ),
  };
}

export async function issueResend(
  rawManageToken: string,
): Promise<
  | { status: "sent"; verifyToken: string }
  | { status: "cooldown"; retryAfterSeconds: number }
  | { status: "noop" }
  | { status: "invalid" }
> {
  const hash = hashToken(rawManageToken);
  const now = new Date();
  const verifyToken = await issueVerifyToken("manage_token_hash", hash, now);
  if (verifyToken) return { status: "sent", verifyToken };

  const row = await findByManageHash(hash);
  if (!row) return { status: "invalid" };
  if (row.verified_at && (await bumpCooldown("manage_token_hash", hash, now))) {
    return { status: "noop" };
  }
  return {
    status: "cooldown",
    retryAfterSeconds: Math.max(
      1,
      remainingSeconds(row.last_email_sent_at, now),
    ),
  };
}

export async function verifyEmail(
  rawVerifyToken: string,
): Promise<"verified" | "already_verified" | "invalid"> {
  const hash = hashToken(rawVerifyToken);
  const now = new Date();
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from(TABLE)
    .update({ verified_at: now.toISOString() })
    .eq("verify_token_hash", hash)
    .is("verified_at", null)
    .gt("verify_expires_at", now.toISOString())
    .select("id");
  if (error) fail("verify", error);
  if (Array.isArray(data) && data.length === 1) return "verified";

  const { data: row, error: findError } = await db
    .from(TABLE)
    .select("verified_at")
    .eq("verify_token_hash", hash)
    .maybeSingle();
  if (findError) fail("find by verify token", findError);
  const verifiedAt = (row as { verified_at: string | null } | null)
    ?.verified_at;
  return verifiedAt ? "already_verified" : "invalid";
}
