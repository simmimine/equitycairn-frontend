---
title: "Accounts are only for verified beta members, and confirming one needs the password again"
author: Simeon
date: 2026-11-23
branch: feature/beta-login
cost: { minutes: 29, tokens: 319185 }
id: l-c7455124
scope: repo
status: active
src: agent
touches:
  - pnpm-lock.yaml
  - docs/superpowers/plans/2026-11-23-beta-login.md
  - docs/superpowers/specs/2026-11-23-beta-login-design.md
  - src/lib/auth/session.test.ts
  - src/lib/auth/session.ts
  - src/app/actions/onboarding.test.ts
  - src/app/actions/onboarding.ts
  - src/app/feed/feed-content.test.tsx
  - src/app/feed/feed-content.tsx
  - src/app/feed/page.tsx
---

## Decided
Login is Supabase Auth for passwords and sessions, with our own Resend confirmation email. The server checks the verified beta list before creating an unconfirmed account, and a database trigger on the account table refuses anyone who isn't a verified member. The email card says plainly whether an address is not on the list, unverified, new, or has an account (the owner chose a clear experience over hiding membership); this is rate limited per client. The confirm link only opens a form: confirming needs the emailed token AND the password chosen at sign-up, so a stranger who pre-registers a member's address with a password they know cannot get it confirmed when the member clicks the link. Re-sending the confirmation re-runs account creation and replaces the pending account.
Wait for the real request (`connection()`) after reading cookies and before building the Supabase session client, so the client's clock read never lands inside Next's prerender validation.

## Tried and ruled out
- Generic "if this email is on the list we've emailed you" messages: the owner found it a poor experience.
- Supabase's built-in mailer: a few mails per hour and its own template.
- Confirming on link open: mail scanners prefetch links, and it enables the pre-registration takeover above.

## Watch out
- Pages that read the session must read request cookies BEFORE checking env vars (see the session client), otherwise `next build` tries to prerender them and fails when keys are absent.
- `pnpm add` rewrites the lockfile in a different style; run `pnpm prettier --ignore-path /dev/null --write pnpm-lock.yaml` or the diff is thousands of lines.
- `pnpm test:e2e` refuses to start when a dev server already runs; set `E2E_PORT=3000` to reuse it, but its dev-tools button breaks three join-beta tests: use `pnpm build` + `pnpm start --port 3100` instead.
- The wrong-password check on the confirm page relies on Supabase returning `email_not_confirmed` only after the password is correct; verify against the live project.

In the code: src/lib/auth/accounts.ts, src/app/actions/confirm-account.ts, supabase/migrations/20261124000000_beta_login.sql
- The error ("Blocking Route ... unstable value Date.now()") only appears in `next dev` when a real session cookie is present. `pnpm build` passed before and after, so the build is not evidence the fix works.
- The fix was not confirmed in a signed-in dev session when committed. If the error returns, try building the client lazily inside `getUser()` instead.
- The unit test only proves `connection()` is called, not that Next stops complaining.

In the code: src/lib/auth/session.ts (`createSessionClient`), src/lib/auth/session.test.ts.
