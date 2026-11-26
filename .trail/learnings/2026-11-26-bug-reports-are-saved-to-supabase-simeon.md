---
title: "Bug reports are saved to Supabase and emailed to the owner, not sent to public GitHub issues"
author: Simeon
date: 2026-11-26
branch: main
cost: { minutes: 1, tokens: 1908 }
id: l-4fd87af3
scope: repo
status: active
src: agent
touches:
  - src/lib/email/send.ts
---

## Decided
In-app bug reports go into a Supabase table and the owner gets an email about each one (owner's choice, not built yet). Save first, then email, so a failed email loses nothing.

## Tried and ruled out
- Email only: a failed send would lose the report.
- Copying reports automatically into GitHub issues: the repository is public and reports can hold personal details.

## Watch out
- The issue tracker is still undecided.
- Resend's test sender only reaches the Resend account's own address until a domain is verified.

In the code: send with `sendEmail` in src/lib/email/send.ts.
