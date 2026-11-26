import "server-only";

import { getSupabaseAdmin, getSupabaseAnon } from "@/lib/supabase/server";

import { createSessionClient } from "./session";

type StateRow = { id: string; confirmed: boolean };

async function findAccount(email: string): Promise<StateRow | null> {
  const { data, error } = await getSupabaseAdmin().rpc("auth_user_state", {
    p_email: email,
  });
  if (error) throw new Error(`accounts: state: ${error.message}`);
  const row = Array.isArray(data)
    ? (data[0] as StateRow | undefined)
    : undefined;
  return row ?? null;
}

export async function getAccountState(
  email: string,
): Promise<"none" | "unconfirmed" | "confirmed"> {
  const row = await findAccount(email);
  if (!row) return "none";
  return row.confirmed ? "confirmed" : "unconfirmed";
}

/**
 * Creates an unconfirmed account and returns the token hash for the confirm
 * link. An existing unconfirmed account (nobody has proven the inbox) is
 * replaced; a confirmed one is never touched.
 */
export async function createPendingAccount(
  email: string,
  password: string,
): Promise<{ tokenHash: string } | { error: "exists_confirmed" | "failed" }> {
  const existing = await findAccount(email);
  if (existing?.confirmed) return { error: "exists_confirmed" };

  const admin = getSupabaseAdmin().auth.admin;
  if (existing) {
    const { error } = await admin.deleteUser(existing.id);
    if (error) return { error: "failed" };
  }
  const { data, error } = await admin.generateLink({
    type: "signup",
    email,
    password,
  });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return { error: "failed" };
  return { tokenHash };
}

/**
 * True when `password` is the one chosen for a pending (unconfirmed) account.
 * Relies on Supabase checking the password before the confirmation state:
 * a correct password yields `email_not_confirmed`, a wrong one
 * `invalid_credentials`. Creates no session.
 */
export async function passwordMatchesPending(
  email: string,
  password: string,
): Promise<boolean> {
  const { error } = await getSupabaseAnon().auth.signInWithPassword({
    email,
    password,
  });
  return error?.code === "email_not_confirmed";
}

/** Confirms the account and signs the user in (cookies set via the session client). */
export async function confirmWithToken(tokenHash: string): Promise<boolean> {
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.verifyOtp({
    type: "signup",
    token_hash: tokenHash,
  });
  return !error;
}

/** Password sign-in through the session client (sets cookies on success). */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<"ok" | "invalid" | "unconfirmed"> {
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) return "ok";
  if (error.code === "email_not_confirmed") return "unconfirmed";
  if (error.code === "invalid_credentials") return "invalid";
  throw new Error(`accounts: sign in: ${error.code ?? "unknown"}`);
}

/**
 * `local` ends this device's session; `global` ends every session. False when
 * Supabase could not do it.
 */
export async function signOutSession(
  scope: "local" | "global",
): Promise<boolean> {
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signOut({ scope });
  return !error;
}
