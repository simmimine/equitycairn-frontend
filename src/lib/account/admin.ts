import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

function check(context: string, error: { message: string } | null) {
  if (error) throw new Error(`account admin: ${context}: ${error.message}`);
}

/** Sets a new password and ends every session of the user. */
export async function setPassword(
  userId: string,
  password: string,
): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.auth.admin.updateUserById(userId, { password });
  check("set password", error);
  const ended = await db.rpc("end_user_sessions", { p_user_id: userId });
  check("end sessions", ended.error);
}

/** Deletes the account, its data and its beta sign-up. */
export async function deleteAccount(userId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc("delete_account", {
    p_user_id: userId,
  });
  check("delete", error);
}
