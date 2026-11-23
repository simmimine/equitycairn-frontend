import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Stateless client with the publishable key, for checks that must not create a session. */
export function getSupabaseAnon(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
