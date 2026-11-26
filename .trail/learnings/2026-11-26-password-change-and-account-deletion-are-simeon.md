---
title: Password change and account deletion are confirmed by our own one-time emailed links
author: Simeon
date: 2026-11-26
branch: docs/settings-page-brainstorm
cost: { minutes: 1, tokens: 6331 }
id: l-2f89ae62
scope: repo
status: active
src: agent
touches:
  - docs/superpowers/specs/2026-11-26-settings-page-design.md
  - src/lib/auth/accounts.ts
---

## Decided
Both actions send a link to the sign-up email, because the owner wants proof it is the real user (not built yet). Nothing happens until a button is pressed, because mail scanners open links. We make and store our own hashed one-time tokens, so both actions work the same way.

## Tried and ruled out
- Supabase's recovery link for passwords with our own link for deletion: rejected because it means two systems, and using the recovery link signs in whoever holds it.

## Watch out
- Supabase `signOut()` defaults to global scope, because of which the current Sign out ends every session.
- The link rule only covers our screens, because a signed-in session can still call Supabase's account API directly.

In the code: docs/superpowers/specs/2026-11-26-settings-page-design.md, `signOutSession` in src/lib/auth/accounts.ts.
