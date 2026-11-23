# Onboarding redesign — design

## Intent

Make the onboarding flow match the Penpot page "Onboarding — Stock picker" (4 steps, mobile + desktop, light + dark), built only from shadcn components.

## Goals / non-goals

- Goals: desktop 3-column layout (rail with progress + stepper, form, info card), mobile compact header + pinned CTA; pill-card radios for step 2; welcome step with icon + expectations; step 4 company picker (search, category chips, cards, watchlist panel, cap 10).
- Non-goals: backend/schema/action changes, theme changes (tokens already match), a "Your feed" 5th step.

## Constraints

- shadcn components only (registry-installed); Tailwind classes for layout only.
- pnpm. Next.js 16 (read node_modules/next/dist/docs before Next-specific code).
- Saved watchlist remains a ticker string via `saveWatchlistAction`.

## Approaches

1. Rewrite in place in one file — rejected: file already ~350 lines.
2. Split into shell/stepper/step components/stock-picker, state stays in `OnboardingFlow` — chosen.
3. Separate mobile and desktop trees — rejected: duplicate logic; breakpoints suffice.

## Decisions

- Picker uses hardcoded popular list (~12); UI cap 10; unknown ticker-like search offers "Add ‘XYZ’"; stored tickers outside the list are restored as selected.
- Picker pure logic lives in `src/lib/onboarding/companies.ts` (unit-tested).
- Tests: Vitest component + unit; Playwright e2e with auth/session seam chosen by builder.
- Review loop with /code-review until clean.
