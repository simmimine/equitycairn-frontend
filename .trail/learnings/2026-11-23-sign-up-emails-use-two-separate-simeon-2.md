---
title: "Sign-up emails use two separate tokens so nobody can verify an inbox they can't read"
author: Simeon
date: 2026-11-23
branch: feature/email-verification
cost: { minutes: 37, tokens: 159610 }
id: l-2167c73b
scope: repo
status: active
replaces: l-0ffe2d38
src: agent
touches:
  - src/lib/signup/client-key.ts
  - docs/superpowers/specs/2026-11-23-email-verification-design.md
---

## Decided
The beta sign-up uses two separate tokens. The verify token is sent only in the email. The manage token is in the /join-beta URL: it can show the page and trigger a re-send, but it cannot verify. Both are stored only as hashes. Throttling and cooldowns live in the database, since the app can run on several instances. The verify hash is kept after use so a second click says "already verified". The throttling key (`src/lib/signup/client-key.ts`) is the x-forwarded-for entry counted from the RIGHT using TRUSTED_PROXY_HOPS (default 1), because the leftmost entry is client-controlled. Cooldown timing is identical for verified and unverified addresses so nobody can enumerate verified addresses.

## Tried and ruled out
- Throttling in app memory: breaks across multiple instances.
- One token for both the redirect URL and the email link: lets a typist verify an inbox they don't own.
- Keying on the first x-forwarded-for entry: a client can spoof it to dodge the limit.

## Watch out
- Resend's test sender only delivers to the Resend account's own address until a domain is verified.
- Locally all requests share one throttling bucket.
