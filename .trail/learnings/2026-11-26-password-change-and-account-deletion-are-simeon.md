---
title: Password change and account deletion are confirmed by our own one-time emailed links
author: Simeon
date: 2026-11-26
branch: docs/settings-page-brainstorm
cost: { minutes: 9, tokens: 102659 }
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
---

## Decided
Both actions send a link to the sign-up email, because the owner wants proof it is the real user (not built yet). Nothing happens until a button is pressed, because mail scanners open links. We make and store our own hashed one-time tokens, so both actions work the same way.
Turn on Supabase "Require current password when changing" and set the session cookie httpOnly, because a stolen session could otherwise change the password directly and skip our emailed link (not built or switched on yet).
Deleting an account removes the beta sign-up record and the auth user in one database function, because both must go together (planned, not built yet). The confirm page uses referrer `strict-origin`.
Settings search was added by the owner after the design was approved, and uses the same Ctrl+K / ⌘K as the feed search, because both sit in the header (not built yet).

## Tried and ruled out
- Supabase's recovery link for passwords with our own link for deletion: rejected because it means two systems, and using the recovery link signs in whoever holds it.
- Supabase "Secure password change": rejected as the main guard because it asks for nothing extra within 24 hours of signing in.
- A database trigger blocking other password changes: rejected because it risks breaking Supabase's own sign-in or reset behaviour.
- A delete trigger on the auth users table: rejected because `createPendingAccount` deletes unconfirmed users when someone signs up again, so it would wipe their beta sign-up.
- Referrer `no-referrer` on the confirm page: rejected because it should send `Origin: null` on the form post, which Next would refuse (reasoned from the fetch rules, not tested).
- Creating three full boards in one Penpot script: it failed with a 120 second timeout and left nothing behind, because one large board alone takes about 17 seconds.

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
