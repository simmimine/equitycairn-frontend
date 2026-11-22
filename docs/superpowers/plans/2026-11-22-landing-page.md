# EquityCairn Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the EquityCairn landing page at `/` with a validated, spam-resistant beta email sign-up stored in Supabase.

**Architecture:** A single server-rendered route composed of section components. The sign-up is a client form (`useActionState`) posting to a Next.js server action that validates with a shared zod schema and inserts into a locked-down Supabase table using a server-only secret key.

**Tech Stack:** Next.js 16.4.6 (App Router), React 19.3, Tailwind 4, shadcn `base-nova` (Base UI), lucide, zod, `@supabase/supabase-js`, Vitest + Testing Library, Playwright, pnpm 12.

**Spec:** `docs/superpowers/specs/2026-11-22-landing-page-design.md`

## Global Constraints

- Next 16 has breaking changes: before writing server actions, metadata or env code, read the relevant guide in `node_modules/next/dist/docs/` (per `AGENTS.md`).
- shadcn rules: `FieldGroup`/`Field` for forms; `gap-*` not `space-*`; `size-*` for equal dimensions; semantic tokens only (`bg-primary`, `text-muted-foreground`), no raw colours and no `dark:` colour overrides; `Badge`, `Separator`, `Card` instead of custom markup; no sizing classes on icons inside components; Base UI uses `render`, not `asChild`. Add components with `pnpm dlx shadcn@latest add <name>` and review the generated files.
- Env vars are server-only: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`. Never `NEXT_PUBLIC_`.
- Email rules (exact): trim, lowercase, max 254 chars, valid format, non-empty.
- Duplicate email returns the same success as a new insert. DB errors return a generic message; never log the email.
- Copy must not claim "all news", "real-time", trading performance, or publisher endorsement; sample feed is fictional and labelled "Sample"; footer states "for information only, not investment advice".
- Supabase table `public.beta_signups`: RLS enabled, no policies, no grants to `anon`/`authenticated`.
- Pin dependency versions; commit `pnpm-lock.yaml`. Do not commit `.env.local` or `.superpowers/`.
- Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check` before each commit.

## Review Focus

- Email with surrounding spaces or mixed case (`"  Ann@Example.COM "`) is stored as `ann@example.com`, and a later `ANN@example.com` is treated as a duplicate.
- A 255+ character email, an empty string, `a@b`, and a missing field are rejected with `invalid_email` and never reach Supabase.
- Honeypot filled: returns success, writes nothing.
- Missing `SUPABASE_URL`/`SUPABASE_SECRET_KEY` at runtime returns `server_error`, does not crash the page or the build.
- Double-clicking submit does not send twice (button disabled while pending) and a second submit of the same address still shows success.
- Page is usable in both themes and at tablet/mobile widths (form and sample feed stack vertically; no horizontal scroll).

---

### Task 1: Email validation schema

**Files:**

- Create: `src/lib/signup/email.ts`, `src/lib/signup/types.ts`
- Test: `src/lib/signup/email.test.ts`

**Interfaces:**

- Produces: `parseEmail(input: unknown): { ok: true; email: string } | { ok: false }` (trimmed, lowercased); `JoinBetaResult = { ok: true } | { ok: false; error: "invalid_email" | "server_error" }` in `types.ts`.

- [ ] **Step 1: Install zod** with `pnpm add zod` (pinned in lockfile).
- [ ] **Step 2: Write failing tests** in `email.test.ts`: `parseEmail("  Ann@Example.COM ")` → `{ ok: true, email: "ann@example.com" }`; `parseEmail("")`, `"a@b"`, `"not-an-email"`, `undefined`, `42`, and `"a".repeat(250) + "@x.com"` (over 254) → `{ ok: false }`; a 254-char valid address → ok.
- [ ] **Step 3: Run** `pnpm vitest run src/lib/signup/email.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 4: Implement** `parseEmail` with a zod string schema (trim → toLowerCase → max 254 → email); and the `JoinBetaResult` type.
- [ ] **Step 5: Run** the same command. Expected: PASS.
- [ ] **Step 6: Commit** `feat: add email validation schema`.

### Task 2: Supabase table and migration

**Files:**

- Create: `supabase/migrations/<timestamp>_create_beta_signups.sql`

**Interfaces:**

- Produces: table `public.beta_signups(id uuid pk default gen_random_uuid(), email text not null check (char_length(email) <= 254), created_at timestamptz not null default now(), source text)` with `create unique index beta_signups_email_lower_key on public.beta_signups (lower(email))`; RLS enabled; `revoke all on public.beta_signups from anon, authenticated`.

- [ ] **Step 1: Load the `supabase-postgres-best-practices` skill**, then write the migration file (generate the timestamped name with a `YYYYMMDDHHMMSS_` prefix).
- [ ] **Step 2: Apply** to project `toibkwszamgrgsurwuos` with the Supabase MCP `apply_migration` using the same name and SQL (the project has no local DB).
- [ ] **Step 3: Verify** with MCP `list_tables` (verbose) that the table exists with RLS on; run `get_advisors` (security) and expect no findings for `beta_signups`.
- [ ] **Step 4: Verify access is closed** with `execute_sql`: `select has_table_privilege('anon','public.beta_signups','insert')` and the same for `select`, for `authenticated` → all `false`.
- [ ] **Step 5: Commit** `feat: add beta_signups table migration`.

### Task 3: Server client and `joinBeta` action

**Files:**

- Create: `src/lib/supabase/server.ts`, `src/app/actions/join-beta.ts`, `.env.example` (update if it exists)
- Test: `src/app/actions/join-beta.test.ts`

**Interfaces:**

- Consumes: `parseEmail`, `JoinBetaResult` (Task 1).
- Produces: `getSupabaseAdmin(): SupabaseClient` (server-only; throws if env missing; `auth.persistSession: false`); `joinBeta(prev: JoinBetaResult | null, formData: FormData): Promise<JoinBetaResult>` marked `"use server"`.

- [ ] **Step 1: Install** `pnpm add @supabase/supabase-js server-only`.
- [ ] **Step 2: Write failing tests** mocking `@/lib/supabase/server`: valid email → inserts `{ email: "ann@example.com", source: "landing" }` into `beta_signups`, returns `{ ok: true }`; Postgres error code `23505` → `{ ok: true }`; other error → `{ ok: false, error: "server_error" }` and nothing logged contains the email; invalid email → `{ ok: false, error: "invalid_email" }` and the client is never called; `website` field non-empty → `{ ok: true }`, client never called; `getSupabaseAdmin` throwing → `server_error`.
- [ ] **Step 3: Run** `pnpm vitest run src/app/actions/join-beta.test.ts`. Expected: FAIL.
- [ ] **Step 4: Implement** the client (reads `SUPABASE_URL`, `SUPABASE_SECRET_KEY`; imports `server-only`) and the action (honeypot field name `website`; order: honeypot → parse → insert; catch all errors to `server_error`).
- [ ] **Step 5: Add** `SUPABASE_URL=` and `SUPABASE_SECRET_KEY=` (blank values, with a comment) to `.env.example`; confirm `.env*.local` is git-ignored.
- [ ] **Step 6: Run** the tests. Expected: PASS.
- [ ] **Step 7: Commit** `feat: add joinBeta server action`.

### Task 4: SignupForm component

**Files:**

- Create: `src/components/signup-form.tsx`; add shadcn `input`, `field`, `spinner`, `sonner`/`toast` (check the shadcn skill for the Base UI toast name) via the CLI
- Test: `src/components/signup-form.test.tsx`

**Interfaces:**

- Consumes: `joinBeta`, `JoinBetaResult`, `parseEmail`.
- Produces: `<SignupForm id?: string />` (client component; accepts `id` so two instances on one page have unique input ids).

- [ ] **Step 1: Add components** with `pnpm dlx shadcn@latest add input field spinner <toast>`, then read and fix the generated files per the shadcn rules; mount the toaster once in `src/app/layout.tsx`.
- [ ] **Step 2: Write failing tests** (mock `joinBeta`): typing an invalid address and submitting shows an inline error and does not call the action; a valid address calls it with the `FormData`; while pending the button is disabled and shows a `Spinner`; `{ ok: true }` shows the success message ("You're on the list") and clears the field; `server_error` shows "Something went wrong, please try again"; the honeypot input is `aria-hidden`, `tabIndex=-1`, and not focusable by label.
- [ ] **Step 3: Run** `pnpm vitest run src/components/signup-form.test.tsx`. Expected: FAIL.
- [ ] **Step 4: Implement** `SignupForm` with `useActionState(joinBeta, null)`, `FieldGroup`/`Field`, `Input type="email" autoComplete="email" required`, client pre-check via `parseEmail`, `data-invalid` + `aria-invalid` on error, hidden honeypot `website`, helper text "No spam. We'll only email you about the beta."
- [ ] **Step 5: Run** the tests. Expected: PASS.
- [ ] **Step 6: Commit** `feat: add beta signup form`.

### Task 5: Landing page sections

**Files:**

- Create: `src/components/landing/{site-header,hero,sample-feed,how-it-works,trust,faq,final-cta,site-footer}.tsx`; add shadcn `card`, `badge`, `separator`, `accordion` via the CLI
- Modify: `src/app/page.tsx`, `src/app/layout.tsx` (metadata title/description/openGraph from the tagline), `src/app/page.test.tsx`, `e2e/home.spec.ts`

**Interfaces:**

- Consumes: `SignupForm` (Task 4).
- Produces: `Home` composing header → hero (headline "The market news that matters to your watchlist.", sub-line "Know what matters across your watchlist, from one feed.", `SignupForm id="hero-email"`, `SampleFeed`) → how it works (3 cards: follow tickers · one grouped feed · go to the original source) → trust (attribution, duplicate grouping, links to originals, no trading advice) → FAQ (5 questions from the spec) → final CTA (`SignupForm id="cta-email"`) → footer. The header "Join the beta" button links to `#hero-email`-containing section anchor `#join`.

- [ ] **Step 1: Add components** with the shadcn CLI and review the generated files.
- [ ] **Step 2: Update tests first.** In `page.test.tsx` assert: a level-1 heading with the tagline; two email inputs; the "Sample" label is present; the text "not investment advice" is present; no text matching `/real-time|all news/i`. In `e2e/home.spec.ts`: the page loads with the tagline heading; submitting `not-an-email` shows an inline error; the header button scrolls to the form (input visible). Mock `joinBeta` in the unit test.
- [ ] **Step 3: Run** `pnpm test`. Expected: FAIL on the new assertions.
- [ ] **Step 4: Implement** the sections and compose `Home` (server component; fictional tickers/headlines in `SampleFeed` as a typed constant array with `Badge` chips, source counts, and `Separator`s). Layout: hero is two columns from `md`, stacked below; container `max-w-6xl`, consistent section padding.
- [ ] **Step 5: Run** `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, and `pnpm test:e2e`. Expected: all pass.
- [ ] **Step 6: Visual check** with `pnpm dev` at desktop, tablet (~820px) and mobile (~390px) widths in light and dark themes (Chrome tools or screenshots): no horizontal scroll, readable contrast, form usable.
- [ ] **Step 7: Commit** `feat: build landing page`.

### Task 6: Configuration, docs and end-to-end verification

**Files:**

- Modify: `README.md`, `package.json` (`docker:run` to pass `--env-file .env.local`)

- [ ] **Step 1: Update README**: document `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (server-only, set as Cloud Run env/secrets in deploy), and the sign-up table.
- [ ] **Step 2: Update `docker:run`** to `... run --rm -p 8080:8080 --env-file .env.local equitycairn-frontend` (keep the existing `sudo`).
- [ ] **Step 3: Real-database check.** With real values in `.env.local`, run `pnpm dev`, submit `Test+Plan@Example.com`, then confirm with MCP `execute_sql` that exactly one row exists with email `test+plan@example.com`; submit `TEST+plan@example.com` again and confirm still one row and the UI still shows success; then delete the test row.
- [ ] **Step 4: Confirm anon is locked out**: call the REST endpoint `GET {SUPABASE_URL}/rest/v1/beta_signups` and `POST` with the publishable key (`get_publishable_keys`); expect permission errors for both.
- [ ] **Step 5: Production build** `pnpm build` passes with and without the env vars set (the page must build without them).
- [ ] **Step 6: Commit** `docs: document signup configuration`.

---

## Self-review notes

- Spec coverage: layout/sections (T5), form + honeypot + validation + non-enumeration (T1, T3, T4), table + RLS + migration (T2), env vars/Docker/README (T3, T6), tests (each task), real-DB and anon checks (T2, T6).
- Not in the plan, per spec non-goals: confirmation email, analytics, admin UI, rate limiting.
- Open call: the toast component name for Base UI is confirmed in Task 4 via the shadcn CLI.
