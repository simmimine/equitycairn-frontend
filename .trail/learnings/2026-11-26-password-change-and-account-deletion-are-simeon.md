---
title: Password change and account deletion are confirmed by our own one-time emailed links
author: Simeon
date: 2026-11-26
branch: docs/settings-page-brainstorm
cost: { minutes: 42, tokens: 375940 }
id: l-2f89ae62
scope: repo
status: active
src: agent
touches:
  - docs/superpowers/specs/2026-11-26-settings-page-design.md
  - src/lib/auth/accounts.ts
  - src/lib/auth/session.ts
  - src/proxy.ts
  - docs/superpowers/plans/2026-11-26-settings-page.md
  - src/components/feed/app-header.tsx
  - e2e/feed.spec.ts
  - e2e/global-setup.ts
  - e2e/settings.spec.ts
  - playwright.config.ts
---

## Decided
Both actions send a link to the sign-up email, because the owner wants proof it is the real user (not built yet). Nothing happens until a button is pressed, because mail scanners open links. We make and store our own hashed one-time tokens, so both actions work the same way.
Turn on Supabase "Require current password when changing" and set the session cookie httpOnly, because a stolen session could otherwise change the password directly and skip our emailed link (not built or switched on yet).
Deleting an account removes the beta sign-up record and the auth user in one database function, because both must go together (planned, not built yet). The confirm page uses referrer `strict-origin`.
Settings search was added by the owner after the design was approved, and uses the same Ctrl+K / ⌘K as the feed search, because both sit in the header (not built yet).
"Sign out of all devices" redirects only when Supabase confirms it, because `signOut` returns an error instead of throwing and the first version sent the user home as if it had worked. A password change ends sessions before and after the update, because a database failure would otherwise leave a new password with old sessions still live.
The settings migration was applied to the live Supabase project at the owner's request (name `settings`), so change the schema with a new migration, because editing the applied file would not reach the database. When Supabase answers `weak_password` or `same_password`, the used link is re-inserted with its old expiry, because the user could otherwise never retry.

## Tried and ruled out
- Supabase's recovery link for passwords with our own link for deletion: rejected because it means two systems, and using the recovery link signs in whoever holds it.
- Supabase "Secure password change": rejected as the main guard because it asks for nothing extra within 24 hours of signing in.
- A database trigger blocking other password changes: rejected because it risks breaking Supabase's own sign-in or reset behaviour.
- A delete trigger on the auth users table: rejected because `createPendingAccount` deletes unconfirmed users when someone signs up again, so it would wipe their beta sign-up.
- Referrer `no-referrer` on the confirm page: rejected because it should send `Origin: null` on the form post, which Next would refuse (reasoned from the fetch rules, not tested).
- Creating three full boards in one Penpot script: it failed with a 120 second timeout and left nothing behind, because one large board alone takes about 17 seconds.
- Ignoring the result of `signOut` for the global scope: rejected because a lost device would stay signed in unnoticed.
- Re-inserting with an upsert: rejected because it would overwrite a newer link the user had requested.

## Watch out
- Supabase `signOut()` defaults to global scope, because of which the current Sign out ends every session.
- The link rule only covers our screens, because a signed-in session can still call Supabase's account API directly.

In the code: docs/superpowers/specs/2026-11-26-settings-page-design.md, `signOutSession` in src/lib/auth/accounts.ts.
- `@supabase/ssr` defaults the cookie to `httpOnly: false`, so it must be set wherever cookies are written, otherwise scripts can read it.
- It is untested that the admin password update still works with the setting on, so check against the real project.

In the code: `createSessionClient` in src/lib/auth/session.ts, `proxy` in src/proxy.ts.
- Keep `createPendingAccount` free of side effects on beta sign-ups, otherwise re-sending a confirmation locks the member out.

In the code: docs/superpowers/plans/2026-11-26-settings-page.md, src/lib/auth/accounts.ts.
- After that timeout the helpers kept in Penpot `storage` were gone, so they had to be redefined.

In the code: docs/superpowers/plans/2026-11-26-settings-page.md, `isSearchShortcut` in src/components/feed/app-header.tsx.
- The settings migration has never been run, because there is no local Supabase; `end_user_sessions` deletes from `auth.sessions` and needs checking on a real project.
- The proxy lets server action requests to the settings page through without a session, because a redirect would hide the "session ended" message; every action must keep checking the session itself.

In the code: `signOutEverywhere` in src/app/actions/login.ts, `setPassword` in src/lib/account/admin.ts, `proxy` in src/proxy.ts.
- Sessions are ended before the password update, so a rejected password still signs the user out on other devices.
- The email-change block and a real password change or deletion have not been exercised with a real user, because only privileges and no-op calls were checked.
- When the owner's dev server holds `.next/dev`, `pnpm test:e2e` cannot start its own; build and serve on port 3100 with the E2E_FAKE variables, then stop it by port, because killing the background shell job leaves the server running.

In the code: supabase/migrations/20261126000000_settings.sql, `restoreLink` in src/lib/account/links.ts.
