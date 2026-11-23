---
title: "Sign-up emails use two separate tokens so nobody can verify an inbox they can't read"
author: Simeon
date: 2026-11-23
branch: feature/email-verification
cost: { minutes: 16, tokens: 52315 }
id: l-0ffe2d38
scope: repo
status: active
src: agent
touches:
  - docs/superpowers/plans/2026-11-23-email-verification.md
  - docs/superpowers/specs/2026-11-23-email-verification-design.md
---

## Decided
The beta sign-up emails a verification link. The link's token (sent only by email) is different from the token in the "check your email" page URL, which can only show that page and trigger a re-send. If they were the same value, anyone could type any address and verify it from their own redirect URL. Both are stored only as hashes. The "one sign-up per minute" limit and the re-send cooldown live in the database, because the app can run on several Cloud Run instances at once. The verify token's hash is kept after use so a second click says "already verified".

## Tried and ruled out
- Throttling in app memory: breaks across multiple instances.
- Using one token for both the redirect URL and the email link: lets a typist verify an inbox they don't own.

## Watch out
- Resend's test sender only delivers to the address on the Resend account until a domain is verified.
- Throttling is per client IP, read from the first `x-forwarded-for` entry; locally all requests share one bucket.

In the code:
- Design: `docs/superpowers/specs/2026-11-23-email-verification-design.md`
