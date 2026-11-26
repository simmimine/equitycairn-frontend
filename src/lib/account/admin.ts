import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

function check(context: string, error: { message: string } | null) {
  if (error) throw new Error(`account admin: ${context}: ${error.message}`);
}

/** Supabase's own rules refused the password: another one may be accepted. */
export class PasswordRejectedError extends Error {}

const REJECTED = new Set(["weak_password", "same_password"]);

/**
 * Sets a new password and ends every session of the user. Sessions go first, so
 * a failure there leaves the password unchanged rather than changed with old
 * sessions still live; and again after, for any started in between.
 */
export async function setPassword(
  userId: string,
  password: string,
): Promise<void> {
  const db = getSupabaseAdmin();
  const endSessions = async () => {
    const { error } = await db.rpc("end_user_sessions", { p_user_id: userId });
    check("end sessions", error);
  };
  await endSessions();
  const { error } = await db.auth.admin.updateUserById(userId, { password });
  if (error?.code && REJECTED.has(error.code)) {
    throw new PasswordRejectedError(error.code);
  }
  check("set password", error);
  await endSessions();
}

/** Deletes the account, its data and its beta sign-up. */
export async function deleteAccount(userId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc("delete_account", {
    p_user_id: userId,
  });
  check("delete", error);
}
