---
title: "Sections the design boards lack stay below the designed home page, styled like its hero"
author: Simeon
date: 2026-11-25
branch: feature/design-refresh
cost: { minutes: 8, tokens: 137645 }
id: l-92a27578
scope: repo
status: active
src: agent
touches:
  - src/components/landing/join-beta-link.tsx
---

## Decided
The owner chose "board first, then the extras": How it works, FAQ, trust points and the closing sign-up stay even though the Penpot home board has none, and they must look and feel like the hero. The sign-up "check your email" board shows an address, but we do not: the token in that URL must not reveal one. Small board text is floored at 11px, and faint greys and dark-mode link blue were swapped for higher contrast.

## Watch out
A link to an in-page anchor that also focuses a field loses the focus: the browser's own jump runs after the click handler. jsdom unit tests passed while real browsers did not, so focus again on the next tick.
Signed-in and token screens are browser-tested on a fake-actions page that needs its own flag set on the server, including when testing against a production build.

In the code: src/components/landing/join-beta-link.tsx, src/app/e2e-auth/ (E2E_FAKE_AUTH=1), docs/superpowers/specs/2026-11-25-design-refresh-design.md
