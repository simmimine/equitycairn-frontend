---
title: "Beta sign-ups go through a server action into a locked-down Supabase table, not straight from the browser"
author: Simeon
date: 2026-11-23
branch: feature/landing-page
cost: { minutes: 56, tokens: 467284 }
id: l-344176a8
scope: repo
status: active
src: agent
touches:
  - docs/superpowers/specs/2026-11-22-landing-page-design.md
  - package.json
  - pnpm-lock.yaml
  - src/app/actions/join-beta.test.ts
  - src/app/actions/join-beta.ts
  - src/app/layout.tsx
  - src/app/page.test.tsx
  - src/components/landing/join-beta-link.tsx
  - src/components/landing/site-header.test.tsx
  - src/components/landing/site-header.tsx
---

## Decided
The landing page's beta email sign-up posts to a server action, which validates the email and inserts it into a Supabase table using a server-only secret key. The table has row-level security on, no policies, and no access for the public or logged-in roles, so only the server can write. Chosen because an open sign-up form's main risk is spam and scraping, and this closes the public API to the table so the bot checks cannot be bypassed.
Duplicate emails return the same success message as a new one, so the form cannot be used to check who has signed up. Emails are trimmed, lowercased, capped at 254 characters and format-checked with a shared schema used by both the browser and the server.

## Tried and ruled out
- Server action using the publishable key with an insert-only policy for the public role: simpler keys, but anyone could write to the table directly through the public API and skip validation and the bot check.
- Browser inserting straight into Supabase: fewest moving parts, weakest spam protection.
- A Notion database or an email provider for storage: the owner chose Supabase.
- A confirmation (double opt-in) email: needs an email provider, so typo'd addresses are stored unverified for now.

## Watch out
- Sign-ups fail with "Something went wrong" until the secret key is set in the environment (`.env.local` locally, deploy secrets on Cloud Run). The server log says which variable is missing.
- The hidden bot-trap field is named `company_url_hp` because browsers autofill fields called `website`, which would silently drop real sign-ups.
- No rate limiting yet; the honeypot only stops naive bots.

In the code:
- `src/app/actions/join-beta.ts`, `src/lib/signup/email.ts`, `src/lib/supabase/server.ts`, `src/components/signup-form.tsx`
- Migration `supabase/migrations/20261122231834_create_beta_signups.sql`
- Env vars `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (server-only, never `NEXT_PUBLIC_`)
