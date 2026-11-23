# Beta-only Login, Account Creation and Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verified beta members can create a password account (confirmed by email), sign in, complete a short onboarding once, and land on an authed `/feed` placeholder.

**Architecture:** Supabase Auth stores passwords and sessions (`@supabase/ssr` cookies, server-side only). All account creation happens in server actions using the secret key after checking `beta_signups`; a DB trigger on `auth.users` is the second gate. Our own Resend email carries a confirm link whose page re-asks for the password. Profile and watchlist live in RLS-protected tables read through the user's session.

**Tech Stack:** Next.js 16 (App Router, `proxy.ts`), Supabase (`@supabase/supabase-js`, new `@supabase/ssr`), zod, Resend via fetch, Vitest + Testing Library, Playwright, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-23-beta-login-design.md`

## Global Constraints

- Next 16: read `node_modules/next/dist/docs/01-app/02-guides/authentication.md` and `01-getting-started/16-proxy.md` before Task 6. Middleware is `src/proxy.ts`; proxy = optimistic checks only; every protected page/action re-verifies with `supabase.auth.getUser()`.
- Package manager: pnpm. Existing Resend module, `check_signup_rate_limit`, `getClientKey`, `parseEmail`, `hashToken/generateToken`, `JoinBetaShell` are reused, not rewritten.
- Passwords 12–72 characters, no composition rules, common-password denylist. Names 1–60 chars, letters/spaces/`'`/`-`/`.` only. Tickers `^[A-Z.]{1,6}$`, max 50 per user.
- Confirm/verify resend cooldown 60 s, enforced by the server. Pending unconfirmed accounts expire after 48 h.
- Never log passwords, raw tokens or email addresses. New pages are `noindex`.
- New env var: `SUPABASE_PUBLISHABLE_KEY` (server-side only).
- Commit trailer on every commit: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Email with different case/whitespace than the beta list (` Foo@X.com`) must resolve to the same member.
- Password of exactly 11, 12, 72 and 73 characters; multi-byte characters.
- `createAccount` called directly (bypassing the card) for a non-member or unverified member must be refused.
- Confirm token reused, expired, or submitted with the wrong password must not confirm or sign in.
- Opening `/auth/confirm` (GET) must never change account state.
- Onboarding step actions called while signed out, or by a user who already finished onboarding, must not write.
- Ticker input like `aapl, msft  tsla`, duplicates, 51st ticker, and `<script>` in names.

---

## File Structure

- `supabase/migrations/20261124000000_beta_login.sql` — trigger gate, `auth_user_state`, `bump_attempts`, `profiles`, `watchlist_items`.
- `src/lib/auth/` — `constants.ts`, `password.ts`, `attempts.ts` (throttle), `accounts.ts` (admin account ops), `session.ts` (ssr client, `getUser`).
- `src/lib/email/send.ts` (extracted transport) + `confirm-email.ts`; `verification-email.ts` refactored to use `send.ts`.
- `src/lib/signup/store.ts` — add `getBetaStatus`, `issueVerifyByEmail`.
- `src/lib/onboarding/` — `schema.ts`, `store.ts`.
- `src/app/actions/` — `login.ts`, `confirm-account.ts`, `onboarding.ts`.
- `src/proxy.ts`; pages `login`, `auth/confirm`, `onboarding`, `feed`; components under `src/components/login`, `onboarding`.

---

### Task 1: Branch, dependency, config

**Files:** Modify `package.json`, `.env.example`, `README.md`; Create `src/lib/auth/constants.ts`.

**Interfaces — Produces:** `PASSWORD_MIN = 12`, `PASSWORD_MAX = 72`, `MAX_WATCHLIST = 50`, `PENDING_TTL_HOURS = 48`, `LOGIN_ATTEMPTS = { email: {max: 20, windowSeconds: 600}, password: {max: 10, windowSeconds: 600} }`.

- [ ] **Step 1:** `git checkout -b feature/beta-login` from `main`; `pnpm add @supabase/ssr`.
- [ ] **Step 2:** Create `constants.ts` with the values above.
- [ ] **Step 3:** Add `SUPABASE_PUBLISHABLE_KEY` to `.env.example` and a README "Login setup" section: the new variable, dashboard settings (disable "Allow new users to sign up", keep "Confirm email" on), and that the migration must be applied.
- [ ] **Step 4:** `pnpm typecheck` passes. Commit `chore: add @supabase/ssr and login config`.

### Task 2: Database migration

**Files:** Create `supabase/migrations/20261124000000_beta_login.sql`.

**Produces (SQL):** trigger `enforce_beta_membership` (before insert on `auth.users`; raises unless a `beta_signups` row has `lower(email) = lower(new.email)` and `verified_at is not null`); `public.auth_user_state(p_email text) returns table(id uuid, confirmed boolean)` (security definer, `search_path = ''`, executable by `service_role` only, empty result = no user); `public.bump_attempts(p_key text, p_window_seconds int, p_max int) returns int` (fixed window; 0 = allowed and counted, else whole seconds until the window resets; atomic single statement; `service_role` only) over new table `public.auth_attempts(key text primary key, window_start timestamptz, count int)` (RLS on, no grants); `public.profiles` and `public.watchlist_items` per the spec with RLS owner-only policies for `authenticated` (select/insert/update on profiles; select/insert/delete on watchlist), ticker check constraint, and a trigger capping 50 rows per user.

- [ ] **Step 1:** Write the SQL following `20261123183816_email_verification.sql` conventions (revoke from public/anon/authenticated, grant to service_role).
- [ ] **Step 2:** Do **not** apply to the remote project without the owner's go-ahead; validate syntax by reading it against the Supabase docs (`mcp__supabase__search_docs` for triggers on `auth.users`). Record in the final report that it is unapplied.
- [ ] **Step 3:** Commit `feat(db): beta login gate, attempts throttle, profiles, watchlist`.

### Task 3: Password and onboarding validation (pure)

**Files:** Create `src/lib/auth/password.ts`, `src/lib/onboarding/schema.ts`; Tests alongside (`*.test.ts`).

**Produces:**

- `validatePassword(password: unknown, confirm: unknown): { ok: true; password: string } | { ok: false; error: "too_short" | "too_long" | "mismatch" | "common" | "invalid" }`
- `nameSchema` / `parseName(first: unknown, last: unknown): { ok: true; first: string; last: string } | { ok: false }`
- `ROLES`, `EXPERIENCES` const arrays; `parseAbout(role: unknown, experience: unknown): { ok: true; role: Role | null; experience: Experience | null } | { ok: false }` (empty string / "skip" → null)
- `parseTickers(input: unknown): { ok: true; tickers: string[] } | { ok: false; error: "invalid" | "too_many" }` — splits on commas/whitespace, uppercases, dedupes.

- [ ] **Step 1: Tests** — `validatePassword`: 11 chars → `too_short`; 12 → ok; 72 → ok; 73 → `too_long`; 72-character multi-byte string measured in **bytes** (72 bytes max, bcrypt limit) → `too_long` when bytes > 72; mismatched confirm → `mismatch`; `"password1234"` → `common`; non-string → `invalid`. `parseName`: `"Ann-Marie O'Neil"` ok; `"<script>"` → not ok; 61 chars → not ok; trims. `parseAbout`: values outside enums → not ok; `""` → null. `parseTickers`: `"aapl, msft  tsla"` → `["AAPL","MSFT","TSLA"]`; duplicates removed; `"AAPL;DROP"` → invalid; 51 distinct → `too_many`; empty string → ok with `[]`.
- [ ] **Step 2:** Run `pnpm vitest run src/lib/auth src/lib/onboarding` — fails.
- [ ] **Step 3:** Implement with zod (as `email.ts` does); denylist is a small hard-coded `Set` of ≥ 20 common 12+ char passwords (lowercased compare). Note spec says 12–72 _characters_; use bytes for the max because bcrypt truncates at 72 bytes, and say so in a comment.
- [ ] **Step 4:** Tests pass. Commit `feat: password and onboarding validation`.

### Task 4: Email transport + confirm email

**Files:** Create `src/lib/email/send.ts`, `src/lib/email/confirm-email.ts`; Modify `src/lib/email/verification-email.ts`; Tests `confirm-email.test.ts` (and existing verification tests must still pass).

**Produces:** `sendEmail({ to, subject, text, html }): Promise<boolean>` (the Resend fetch, API-key/timeout/error-logging behaviour moved verbatim from `verification-email.ts`); `getSiteUrl(): string | null` (same SITE_URL rule: required in production); `sendConfirmEmail(to: string, tokenHash: string): Promise<boolean>` linking to `${SITE_URL}/auth/confirm?token_hash=<enc>&email=<enc>`.

- [ ] **Step 1: Tests** (mock `fetch`) — sends to Resend with subject "Confirm your EquityCairn account" and a link containing both encoded params; HTML-escapes the link; returns false and logs no address/token on non-2xx and on missing key; existing `verification-email` tests unchanged.
- [ ] **Step 2:** Run — new tests fail. **Step 3:** Extract and implement. **Step 4:** `pnpm vitest run src/lib/email` passes. Commit `refactor: extract email transport; add account confirm email`.

### Task 5: Beta status store + attempts throttle

**Files:** Modify `src/lib/signup/store.ts`, `store.test-helpers.ts` (fake must support `.select().eq()` by email, already similar); Create `src/lib/auth/attempts.ts`; Tests `store.test.ts` additions, `attempts.test.ts`.

**Produces:**

- `getBetaStatus(email: string): Promise<"not_listed" | "unverified" | "verified">` (email lowercased/trimmed).
- `issueVerifyByEmail(email: string): Promise<{ status: "sent"; verifyToken: string } | { status: "cooldown"; retryAfterSeconds: number } | { status: "noop" }>` — reuses `issueVerifyToken("id", …)` via an email lookup; `noop` for not-listed and verified rows.
- `checkAttempts(scope: "login-email" | "login-pw" | "confirm", clientKey: string, limit: { max: number; windowSeconds: number }): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }>` calling RPC `bump_attempts` with key `${scope}:${clientKey}`.

- [ ] **Step 1: Tests** — `getBetaStatus` for absent / unverified / verified rows and mixed-case input with spaces; `issueVerifyByEmail`: unverified out of cooldown → `sent` with a new token hash stored; within cooldown → `cooldown` with seconds; verified or absent → `noop`; `checkAttempts` maps RPC 0 → allowed, N → `retryAfterSeconds: N`, and throws on RPC error.
- [ ] **Step 2–4:** Fail, implement, pass (`pnpm vitest run src/lib`). Commit `feat: beta status lookup, email-keyed resend, attempts throttle`.

### Task 6: Accounts module and session helpers

**Files:** Create `src/lib/auth/accounts.ts`, `src/lib/auth/session.ts`, `src/proxy.ts`; Tests `accounts.test.ts` (mock `getSupabaseAdmin` and the anon client factory).

**Produces (`accounts.ts`, server-only):**

- `getAccountState(email: string): Promise<"none" | "unconfirmed" | "confirmed">` (RPC `auth_user_state`).
- `createPendingAccount(email: string, password: string): Promise<{ tokenHash: string } | { error: "exists_confirmed" | "failed" }>` — if an unconfirmed user exists, delete it first; then `admin.generateLink({ type: "signup", email, password })` and return `properties.hashed_token`.
- `passwordMatchesPending(email: string, password: string): Promise<boolean>` — stateless anon client `signInWithPassword`; error code `email_not_confirmed` ⇒ true; anything else ⇒ false. **Spike:** verify this against the live project when migrations are applied; if Supabase doesn't distinguish, fall back per spec and note it.
- `confirmWithToken(tokenHash: string): Promise<boolean>` — `verifyOtp({ type: "signup", token_hash })` using the **session** client so cookies are set.

**Produces (`session.ts`):** `createSessionClient(): Promise<SupabaseClient>` (`createServerClient` from `@supabase/ssr` with `cookies()`; publishable key; setAll tolerates read-only contexts); `getUser(): Promise<User | null>` (uses `auth.getUser()`); `requireUser(): Promise<User>` (redirects to `/login`).

**`proxy.ts`:** refreshes the session cookie via `@supabase/ssr` and redirects unauthenticated requests for `/feed` and `/onboarding` to `/login`, and authenticated requests for `/login` to `/feed`; `matcher` excludes static assets. Comment that it is optimistic only.

- [ ] **Step 1: Tests** — `createPendingAccount` deletes an unconfirmed user before creating; returns `exists_confirmed` for confirmed; `passwordMatchesPending` true only for `email_not_confirmed`; `getAccountState` maps RPC rows (empty → none).
- [ ] **Step 2–4:** Fail, implement, pass; `pnpm typecheck`. Commit `feat: account admin helpers, session client and proxy`.

### Task 7: Login actions

**Files:** Create `src/app/actions/login.ts`, `src/lib/auth/types.ts`; Test `login.test.ts` (mock `headers`, store, accounts, email, `next/navigation`, `next/server` `after`, as `join-beta.test.ts` does).

**Produces (`types.ts`):** `CheckEmailResult = { ok: true; state: "not_listed" | "unverified" | "no_account" | "has_account" } | { ok: false; error: "invalid_email" | "server_error" } | { ok: false; error: "rate_limited"; retryAfterSeconds: number }`; `CreateAccountResult = { ok: true } | { ok: false; error: "not_member" | "has_account" | "cooldown" | "password" | "invalid_email" | "server_error"; passwordError?: …; retryAfterSeconds?: number }`; `SignInResult = { ok: false; error: "invalid_credentials" | "rate_limited" | "invalid_email" | "server_error"; retryAfterSeconds?: number }` (success redirects).

**Produces (`login.ts`, all `"use server"`):** `checkEmail(email: string)`, `resendBetaVerification(email: string)` (returns `{ok:true,retryAfterSeconds}`/`cooldown`; sends via `sendVerificationEmail` in `after()`), `createAccount(email: string, password: string, confirm: string)`, `resendConfirmation(email: string, password: string)` is **not** provided — resend re-runs `createAccount` (replaces the pending account, subject to a 60 s `confirm` attempt cooldown), `signIn(email: string, password: string)` (redirects to `/feed`), `signOut()` (redirects to `/`).

- [ ] **Step 1: Tests** — `checkEmail`: returns each of the four states (mock status + account state: verified & none → `no_account`; verified & confirmed → `has_account`; verified & unconfirmed → `no_account`); invalid email; over limit → `rate_limited`; never sends email. `createAccount`: **refuses `not_listed` and `unverified` emails** (no admin call made); password errors surface and no account is created; replaces unconfirmed and sends the confirm email after response; second call within 60 s → `cooldown`; confirmed account → `has_account`. `signIn`: wrong password → generic `invalid_credentials`; throttled → `rate_limited`; success redirects to `/feed`. No `console` call receives the email or password (spy).
- [ ] **Step 2–4:** Fail, implement (IP key via `getClientKey(await headers())`; `checkAttempts` with `LOGIN_ATTEMPTS`; use `after()` for email sends as `join-beta.ts` does), pass. Commit `feat: login, create-account and resend actions`.

### Task 8: Confirm action and page

**Files:** Create `src/app/actions/confirm-account.ts`, `src/app/auth/confirm/page.tsx`, `src/components/login/confirm-form.tsx`; Tests `confirm-account.test.ts`, `confirm-form.test.tsx`.

**Produces:** `confirmAccount(tokenHash: string, email: string, password: string): Promise<{ ok: false; error: "wrong_password" | "expired" | "rate_limited" | "server_error"; retryAfterSeconds?: number }>` (success redirects to `/onboarding`). Order: throttle (`confirm` scope, per IP) → `passwordMatchesPending` → `confirmWithToken` → redirect. The page is a server component rendering only the form (reads `token_hash` and `email` from `searchParams`; missing → "Link isn't valid" with a link to `/login`); it performs no writes.

- [ ] **Step 1: Tests** — wrong password never calls `confirmWithToken`; correct password + valid token redirects to `/onboarding`; valid password + bad/used token → `expired`; throttled → `rate_limited`; component shows the error text and disables while pending; page with no params shows invalid state and the page module never imports a write path (assert action not called on render).
- [ ] **Step 2–4:** Fail, implement, pass. Commit `feat: confirm account page requiring password re-entry`.

### Task 9: Login page and cards

**Files:** Create `src/app/login/page.tsx`, `src/components/login/login-flow.tsx` (client; card state machine), small card components as needed; Modify `src/components/landing/site-header.tsx` (add "Log in" link); Tests `login-flow.test.tsx`; E2E `e2e/login.spec.ts`.

**Behaviour:** states `email → (not_listed | unverified | create | signin | check_email)`. Copy: not_listed — "This email isn't on the beta list yet" + link `/#join`; unverified — "Verify your beta sign-up first" + Re-send button with countdown (server `retryAfterSeconds`; initial 0); create — password + confirm fields, show validation errors; check_email — "Check your email to confirm your account" + resend with countdown; signin — password. "Use a different email" returns to the first card. Uses existing `Card`, `Field`, `Input`, `Button`, `ResendButton` pattern (extend `ResendButton` only if it can take an action prop without changing existing tests). Page metadata `robots: noindex`; wrapped in `JoinBetaShell`.

- [ ] **Step 1: Tests** — each of the four `checkEmail` results renders the right card; create card shows mismatch/too-short errors from the action; resend button disabled until countdown ends; "Use a different email" goes back. E2E: `/login` renders email card; invalid email shows error; `/feed` unauthenticated redirects to `/login`; header "Log in" link navigates.
- [ ] **Step 2–4:** Fail, implement, pass (`pnpm vitest run`, `pnpm test:e2e` for the new spec). Commit `feat: login page with card flow`.

### Task 10: Onboarding data, actions and UI; feed placeholder

**Files:** Create `src/lib/onboarding/store.ts`, `src/app/actions/onboarding.ts`, `src/app/onboarding/page.tsx`, `src/components/onboarding/onboarding-flow.tsx`, `src/app/feed/page.tsx`; Tests for each.

**Produces:**

- `store.ts` (uses `createSessionClient`, RLS): `getProfile(): Promise<{ firstName: string|null; lastName: string|null; role: Role|null; experience: Experience|null; onboardedAt: string|null; tickers: string[] } | null>`; `saveName`, `saveAbout`, `saveWatchlist(tickers: string[])` (replace set), `markOnboarded()`.
- Actions (each re-checks `getUser()`; returns `{ ok: true } | { ok: false; error: "unauthenticated" | "invalid" | "too_many" | "server_error" }`; none write once `onboardedAt` is set except none — completed users are redirected): `saveNameAction(first, last)`, `saveAboutAction(role, experience)`, `saveWatchlistAction(input: string)`, `finishOnboardingAction()` (redirects to `/feed`).
- `/onboarding`: `requireUser()`; redirect to `/feed` if onboarded; resume at first incomplete step; cards Name → About (each with Skip/"Prefer not to say") → Welcome → Watchlist (Skip allowed) with Back. `/feed`: `requireUser()`; redirect to `/onboarding` if not onboarded; shows "News for your watchlist", the tickers, an empty state with "Add companies" (links to nothing yet — disabled with "Coming soon"), and a Sign out button (form with `signOut`).

- [ ] **Step 1: Tests** — store functions with a mocked session client (profile upsert shape; watchlist replace deletes then inserts); actions: unauthenticated → `unauthenticated` and no store call; `<script>` name → `invalid`; 51 tickers → `too_many`; `finishOnboardingAction` sets `onboardedAt` and redirects `/feed`; `/feed` redirects to `/onboarding` when not onboarded and renders tickers when onboarded; `/onboarding` redirects away when onboarded; flow component: Skip on About saves nulls; Back preserves entries; welcome copy contains no "real-time"/"all news".
- [ ] **Step 2–4:** Fail, implement, pass. Commit `feat: onboarding flow and feed placeholder`.

### Task 11: Whole-branch verification and docs

- [ ] **Step 1:** `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test` all pass; `pnpm build` succeeds (it needs env vars absent from tests — use placeholders or make clients lazy).
- [ ] **Step 2:** `pnpm test:e2e` passes for the specs that don't need live keys.
- [ ] **Step 3:** `trail build`, `trail check`; save a learning (`trail note`) covering the pre-registration decision and the confirm-page password re-entry; commit it with the change.
- [ ] **Step 4:** Update README with the manual end-to-end checklist from the spec (Resend account email only). Report clearly: migration **not applied**, the `passwordMatchesPending` spike **not run**, manual flow **not run**, until the owner provides go-ahead and keys.
- [ ] **Step 5:** Commit `docs: login setup and verification notes`.
