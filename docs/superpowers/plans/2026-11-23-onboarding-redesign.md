# Onboarding Redesign Implementation Plan

> For agentic workers: use superpowers:executing-plans. Steps use checkboxes.

**Goal:** Onboarding matches the Penpot "Onboarding — Stock picker" design using shadcn components only.
**Architecture:** `OnboardingFlow` keeps state + server-action wiring (actions injectable via optional `actions` prop for e2e). Presentational pieces: shell, stepper, step components, stock picker. Picker logic is pure in `src/lib/onboarding/companies.ts`.
**Tech Stack:** Next 16, React 19, shadcn base-nova (Base UI), Tailwind 4, Vitest, Playwright, pnpm.
**Spec:** docs/superpowers/specs/2026-11-23-onboarding-redesign-design.md

## Global Constraints
- shadcn components only; Tailwind for layout. UI cap 10 companies; server cap 50 unchanged.
- No backend/schema/theme changes. pnpm only.

## Review Focus
- Ticker-like search not in list -> "Add ‘XYZ’" row; invalid text (digits, >6 letters) -> no add row.
- Stored tickers outside popular list restored as selected and removable.
- Selecting an 11th company is blocked with visible message.
- Double submit while pending is ignored; server error shows message and stays on step.
- Mobile viewport shows compact header and works end to end.

### Task 1: shadcn components
- [ ] `pnpm dlx shadcn@latest add progress radio-group toggle-group checkbox input-group avatar scroll-area`; typecheck; commit.

### Task 2: companies logic (TDD)
Files: `src/lib/onboarding/companies.ts`, `companies.test.ts`
Produces: `POPULAR_COMPANIES: Company[]`, `CATEGORIES`, `MAX_PICKS = 10`, `filterCompanies(query, category)`, `tickerCandidate(query, selected)`, `toggleTicker(selected, ticker)` -> `{selected, limited}`, `parseStored(str)`.
- [ ] Tests, fail, implement, pass, commit.

### Task 3: UI pieces
Files: `onboarding-shell.tsx`, `onboarding-stepper.tsx`, `stock-picker.tsx`, `watchlist-panel.tsx`, `option-cards.tsx`; rewrite `onboarding-flow.tsx`; update `onboarding-content.tsx`.
- [ ] Build per Penpot (desktop 3-col rail/form/info card; mobile header + progress + pinned CTA).

### Task 4: Component tests
- [ ] Update `onboarding-flow.test.tsx`; add `stock-picker.test.tsx`, stepper test.

### Task 5: E2E
Files: `src/app/e2e-onboarding/{page,harness}.tsx` (404 unless `E2E_FAKE_ONBOARDING=1`), `e2e/onboarding.spec.ts`, playwright webServer env.
- [ ] Desktop + mobile full flow, skip paths, back, cap, add-custom, validation errors, signed-out redirect.

### Task 6: Review loop
- [ ] lint, typecheck, vitest, playwright, build; `/code-review`; fix; repeat until clean.
