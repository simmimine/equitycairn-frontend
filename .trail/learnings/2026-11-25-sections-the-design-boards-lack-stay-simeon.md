---
title: "Sections the design boards lack stay below the designed home page, styled like its hero"
author: Simeon
date: 2026-11-25
branch: feature/design-refresh
cost: { minutes: 12, tokens: 180846 }
id: l-92a27578
scope: repo
status: active
src: agent
touches:
  - src/components/landing/join-beta-link.tsx
  - docs/superpowers/specs/2026-11-25-design-refresh-design.md
  - e2e/login.spec.ts
  - src/app/globals.css
  - src/components/login/confirm-form.test.tsx
  - src/components/login/confirm-form.tsx
  - src/components/login/login-flow.test.tsx
  - src/components/login/login-flow.tsx
  - src/components/signup-form.test.tsx
  - src/components/signup-form.tsx
---

## Decided
The owner chose "board first, then the extras": How it works, FAQ, trust points and the closing sign-up stay even though the Penpot home board has none, and they must look and feel like the hero. The sign-up "check your email" board shows an address, but we do not: the token in that URL must not reveal one. Small board text is floored at 11px, and faint greys and dark-mode link blue were swapped for higher contrast.
Write test setup hooks with braces so they return nothing.
Sign-up and login forms wrap server action calls in one shared helper. It lets redirects through, logs only the error name (messages can carry what the user typed), and reloads the page when the server no longer recognises the action.

## Watch out
A link to an in-page anchor that also focuses a field loses the focus: the browser's own jump runs after the click handler. jsdom unit tests passed while real browsers did not, so focus again on the next tick.
Signed-in and token screens are browser-tested on a fake-actions page that needs its own flag set on the server, including when testing against a production build.

In the code: src/components/landing/join-beta-link.tsx, src/app/e2e-auth/ (E2E_FAKE_AUTH=1), docs/superpowers/specs/2026-11-25-design-refresh-design.md
A one-line arrow hook that resets a mock returns the mock itself. Vitest treats a returned function as cleanup and calls it, so a mock set to reject fails the test after it has finished.

In the code: `beforeEach` in src/components/login/confirm-form.test.tsx.

## Tried and ruled out
The test for an unreachable server action kept failing with the mock's own error, which looked like the component failing to catch it. The component was fine.
A plain catch in each form: after a redeploy, an open tab showed "Something went wrong" on every retry, with no way out.

In the code: `attempt` in src/lib/attempt.ts.
