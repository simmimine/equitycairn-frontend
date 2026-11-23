import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export type AttemptLimit = { max: number; windowSeconds: number };

/** Counts an attempt for `scope:clientKey`; the database decides atomically. */
export async function checkAttempts(
  scope: "login-email" | "login-pw" | "confirm",
  clientKey: string,
  limit: AttemptLimit,
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  const { data, error } = await getSupabaseAdmin().rpc("bump_attempts", {
    p_key: `${scope}:${clientKey}`,
    p_window_seconds: limit.windowSeconds,
    p_max: limit.max,
  });
  if (error) throw new Error(`attempts: ${error.message}`);
  if (typeof data !== "number") throw new Error("attempts: bad result");
  return data === 0
    ? { allowed: true }
    : { allowed: false, retryAfterSeconds: data };
}
