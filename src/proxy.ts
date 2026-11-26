import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_OPTIONS } from "@/lib/auth/constants";

// Optimistic only: refreshes the session cookie and redirects early. It is NOT
// the security boundary; every protected page and action re-checks the session
// in server code with getUser().
export async function proxy(request: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  let response = NextResponse.next({ request });
  let authed = false;

  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookieOptions: SESSION_COOKIE_OPTIONS,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });
    const { data } = await supabase.auth.getClaims();
    authed = Boolean(data?.claims);
  }

  const path = request.nextUrl.pathname;
  // A settings action from an expired session must reach the action, which refuses it
  // and lets the page say so while keeping what was typed. A redirect would not.
  const settingsAction =
    path === "/settings" && request.headers.has("next-action");
  if (!authed && path !== "/login" && !settingsAction) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (authed && path === "/login") {
    return NextResponse.redirect(new URL("/feed", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/feed/:path*", "/onboarding/:path*", "/settings/:path*", "/login"],
};
