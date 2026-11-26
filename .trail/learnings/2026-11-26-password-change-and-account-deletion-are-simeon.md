---
title: Password change and account deletion are confirmed by our own one-time emailed links
author: Simeon
date: 2026-11-26
branch: docs/settings-page-brainstorm
cost: { minutes: 3, tokens: 16966 }
id: l-2f89ae62
scope: repo
status: active
src: agent
touches:
  - docs/superpowers/specs/2026-11-26-settings-page-design.md
  - src/lib/auth/accounts.ts
  - src/lib/auth/session.ts
  - src/proxy.ts
---

## Decided
Both actions send a link to the sign-up email, because the owner wants proof it is the real user (not built yet). Nothing happens until a button is pressed, because mail scanners open links. We make and store our own hashed one-time tokens, so both actions work the same way.
Turn on Supabase "Require current password when changing" and set the session cookie httpOnly, because a stolen session could otherwise change the password directly and skip our emailed link (not built or switched on yet).

## Tried and ruled out
- Supabase's recovery link for passwords with our own link for deletion: rejected because it means two systems, and using the recovery link signs in whoever holds it.
- Supabase "Secure password change": rejected as the main guard because it asks for nothing extra within 24 hours of signing in.
- A database trigger blocking other password changes: rejected because it risks breaking Supabase's own sign-in or reset behaviour.

## Watch out
- Supabase `signOut()` defaults to global scope, because of which the current Sign out ends every session.
- The link rule only covers our screens, because a signed-in session can still call Supabase's account API directly.

In the code: docs/superpowers/specs/2026-11-26-settings-page-design.md, `signOutSession` in src/lib/auth/accounts.ts.
- `@supabase/ssr` defaults the cookie to `httpOnly: false`, so it must be set wherever cookies are written, otherwise scripts can read it.
- It is untested that the admin password update still works with the setting on, so check against the real project.

In the code: `createSessionClient` in src/lib/auth/session.ts, `proxy` in src/proxy.ts.
