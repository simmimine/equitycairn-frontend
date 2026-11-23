---
title: "Onboarding e2e runs on fake actions, and each step needs its own buttons"
author: Simeon
date: 2026-11-23
branch: feature/onboarding-redesign
cost: { minutes: 25, tokens: 296130 }
id: l-39e6e7da
scope: repo
status: active
src: agent
touches:
  - e2e/onboarding.spec.ts
  - playwright.config.ts
  - src/app/e2e-onboarding/harness.tsx
  - src/components/onboarding/onboarding-flow.test.tsx
  - src/components/onboarding/onboarding-flow.tsx
  - src/components/onboarding/stock-picker.test.tsx
  - src/components/onboarding/stock-picker.tsx
  - src/components/ui/avatar.tsx
  - src/components/ui/checkbox.tsx
  - src/components/ui/input-group.tsx
---

## Decided
Onboarding needs a live Supabase session, so Playwright drives the real flow through a test-only page wired to in-memory fake actions. The page 404s unless the e2e web server sets E2E_FAKE_ONBOARDING=1.
The onboarding flow turns rejected actions into a "Something went wrong" message instead of crashing, but finishing onboarding works by the server action calling redirect(), which rejects the promise with a control-flow error. The catch re-throws errors whose digest starts with NEXT_REDIRECT, otherwise a blanket catch would swallow the redirect and the user would never reach /feed.

## Watch out
Clicking "Choose companies" on the welcome step jumped straight to "finished". React reused the same DOM button, which flipped from type=button to type=submit (form=onboarding-form) during the click, so the browser submitted the next step's form. Unit tests in jsdom did not catch it, only the browser did. Keep the actions container keyed by step.
`next dev` allows one server per directory, so e2e cannot start its dev server while another is running. Verify against `pnpm build` + `pnpm start` with the env var set instead.
`shadcn add` hangs on an overwrite prompt when a dependency (button, input) already exists. Pipe `yes n` into it.

In the code: src/app/e2e-onboarding/, OnboardingFlow `actions` prop and the `key={step}` actions wrapper in src/components/onboarding/onboarding-flow.tsx, e2e/onboarding.spec.ts.
The react-hooks/refs lint rule rejects render-time helper functions that receive callbacks touching a ref. Make those helpers real components (SkipLink) instead.

In the code: `run`, `isRedirect` and `SkipLink` in src/components/onboarding/onboarding-flow.tsx.

## Tried and ruled out
A vitest for the re-throw: vitest reports the intentionally re-thrown error as an unhandled error and fails the run, so the behaviour is covered by the code comment only.
