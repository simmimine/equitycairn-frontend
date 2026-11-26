import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_OPTIONS } from "./constants";

/** Supabase client bound to the request's session cookies (RLS applies as the user). */
export async function createSessionClient(): Promise<SupabaseClient> {
  // Read the request first: this makes the route dynamic, so `next build` never
  // prerenders it (and never needs the env vars below).
  const store = await cookies();
  // The Supabase client reads the clock (Date.now) while loading the session. With a real
  // session cookie present, `cookies()` can resolve during Next's prerender validation, where
  // that is an error; waiting for the actual request keeps the clock read out of it.
  await connection();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY");
  }
  return createServerClient(url, key, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) {
            store.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: cookies are read-only there. proxy.ts refreshes them.
        }
      },
    },
  });
}

/** Validates the session with Supabase (not just the cookie). */
export async function getUser(): Promise<User | null> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
