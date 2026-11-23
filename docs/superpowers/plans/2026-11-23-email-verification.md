# Beta Email Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a beta sign-up, redirect to `/join-beta?token=…`, email a verification link to `/join-beta/verify?token=…`, allow a re-send with a 1-minute cooldown, and limit sign-ups to one per minute.

**Architecture:** Tokens are random, stored only as SHA-256 hashes in `beta_signups`; there are two kinds (verify token in the email, manage token in the redirect URL) so a visitor cannot verify an inbox they cannot read. Throttling state lives in Postgres behind one atomic SQL function. Email goes out through Resend's REST API with `fetch`. Server actions and server-component pages sit on a small server-only data module.

**Tech Stack:** Next.js 16.4.6 (App Router, server actions, async `headers()`/`searchParams`), React 19.3, Supabase (supabase-js 2.119.2, project `toibkwszamgrgsurwuos`), Resend REST API, Node `crypto`, shadcn `base-nova`, Vitest + Testing Library, Playwright, pnpm 12.

**Spec:** `docs/superpowers/specs/2026-11-23-email-verification-design.md` (builds on `docs/superpowers/specs/2026-11-22-landing-page-design.md`)

## Global Constraints

- Work on branch `feature/email-verification`, created by the controller from `feature/landing-page` (stacked on PR #2). Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Next 16 has breaking changes: read the relevant guides in `node_modules/next/dist/docs/` (server actions, `redirect`, `headers()`, `searchParams`, metadata) before writing code. `redirect()` throws `NEXT_REDIRECT`; never call it inside a `try`/`catch` that swallows errors.
- Env vars are server-only (never `NEXT_PUBLIC_`): `RESEND_API_KEY`, `EMAIL_FROM` (default `EquityCairn <onboarding@resend.dev>`), `SITE_URL` (default `http://localhost:3000`), plus the existing `SUPABASE_URL`, `SUPABASE_SECRET_KEY`. Never read or print `.env.local`, and never put a real key in any file, test or report.
- Constants: cooldown and sign-up window `60` seconds; verify-token lifetime `48` hours; tokens are 32 random bytes (base64url); only SHA-256 hashes (hex) are stored.
- Verify token and manage token are different values with different columns; the manage token must never verify anything, and the verify token must never be accepted as a manage token.
- No email enumeration: a repeat sign-up (verified or not) redirects identically; `/join-beta` shows neither the email address nor the verified state. Never log an email address or a raw token.
- A failed email send must not fail the sign-up or the redirect.
- Throttling must be atomic in the database (no read-then-write in app code).
- All new tables/columns keep RLS on with no grants to `public`, `anon`, `authenticated`; new SQL functions are executable by `service_role` only.
- shadcn rules for new UI: `gap-*` not `space-*`, semantic colour tokens only, no sizing classes on icons inside components, Base UI uses `render` not `asChild`, shadcn-generated files keep their upstream `dark:` classes. Pin new dependencies (none expected).
- Before each commit run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check`; `env -u SUPABASE_URL -u SUPABASE_SECRET_KEY -u RESEND_API_KEY pnpm build` must pass (no env var may be read at build time). Keep `.mcp.json` and `.superpowers/` out of commits.

## Review Focus

- Verified and unverified duplicate sign-ups produce the same redirect target shape and the same visitor-facing behaviour (Task 4 test).
- A manage token passed to `/join-beta/verify` is invalid, and a verify token passed to `/join-beta` is invalid (Task 3 and Task 5 tests).
- Expired, empty, malformed and repeated (`?token=a&token=b`) tokens show the invalid state without throwing (Task 3, Task 5).
- Re-send inside the cooldown is refused with the remaining seconds, and a page refresh keeps showing the server's remaining time (Task 3, Task 5).
- Email send failure (network error, non-2xx, missing `RESEND_API_KEY`) still redirects and logs without the address or token (Task 2, Task 4).
- `x-forwarded-for` with several addresses, with spaces, or missing maps to a stable key (Task 3 unit test).
- Verifying a second time shows "already verified" (Task 3, Task 5).

---

### Task 1: Database migration (columns, throttle table and function)

**Files:**

- Create: `supabase/migrations/<YYYYMMDDHHMMSS>_email_verification.sql`

**Interfaces:**

- Produces: on `public.beta_signups`: `verify_token_hash text`, `verify_expires_at timestamptz`, `verified_at timestamptz`, `manage_token_hash text`, `last_email_sent_at timestamptz`, with unique partial indexes on `verify_token_hash` and `manage_token_hash` (where not null). Table `public.signup_rate_limits(key text primary key, last_attempt_at timestamptz not null)`. Function `public.check_signup_rate_limit(p_key text, p_window_seconds integer) returns integer`: atomically returns `0` and records the attempt when the key has no attempt in the last window, otherwise returns the whole seconds remaining (>= 1) without recording. All objects: RLS on / execute revoked from `public, anon, authenticated`, granted to `service_role`.

- [ ] **Step 1: Load the `supabase-postgres-best-practices` skill**, then write the migration file (UTC timestamp prefix). Implement the function as a single `insert … on conflict (key) do update … where` statement (or an equivalent single-statement atomic form), `security invoker`, with a pinned `search_path`.
- [ ] **Step 2: Apply** it to the project with MCP `apply_migration` (name `email_verification`) using the same SQL as the file.
- [ ] **Step 3: Verify** with MCP `execute_sql`: `select public.check_signup_rate_limit('plan-test', 60)` returns `0`, a second immediate call returns a value between `1` and `60`, and `select public.check_signup_rate_limit('plan-test2', 0)` twice returns `0` both times (window 0 never blocks). Then `delete from public.signup_rate_limits where key like 'plan-test%'`.
- [ ] **Step 4: Verify access is closed** with `execute_sql`: `has_table_privilege('anon','public.signup_rate_limits','select')` and `has_function_privilege('anon','public.check_signup_rate_limit(text,integer)','execute')` are both `false`, and `service_role` has execute. Run MCP `get_advisors` (security) and confirm no new warnings for these objects.
- [ ] **Step 5: Commit** `feat: add email verification schema`.

### Task 2: Tokens, constants, client key and verification email sender

**Files:**

- Create: `src/lib/signup/constants.ts`, `src/lib/signup/tokens.ts`, `src/lib/signup/client-key.ts`, `src/lib/email/verification-email.ts`
- Test: `src/lib/signup/tokens.test.ts`, `src/lib/signup/client-key.test.ts`, `src/lib/email/verification-email.test.ts`

**Interfaces:**

- Produces: `COOLDOWN_SECONDS = 60`, `VERIFY_TTL_HOURS = 48` (constants.ts). `generateToken(): { raw: string; hash: string }` and `hashToken(raw: string): string` (tokens.ts; `hash === hashToken(raw)`). `getClientKey(headers: Headers): string` — SHA-256 hex of the `x-forwarded-for` entry trimmed and counted from the right by `TRUSTED_PROXY_HOPS` (default 1), or of the literal `"unknown"` when absent/empty (client-key.ts). `sendVerificationEmail(to: string, rawVerifyToken: string): Promise<boolean>` (verification-email.ts) — `true` only on a 2xx Resend response.

- [ ] **Step 1: Write failing tests.** tokens: two `generateToken()` calls differ; `raw` matches `/^[A-Za-z0-9_-]{43}$/`; `hash` is 64 hex chars and equals `hashToken(raw)`; `hashToken` is deterministic. client-key: `"203.0.113.7, 10.0.0.1"`, `" 203.0.113.7 "` and `"203.0.113.7"` give the same key; missing and empty header give the same key as each other and differ from the first. verification-email (mock global `fetch` and set env in the test): calls `https://api.resend.com/emails` with `POST`, `Authorization: Bearer <key>`, a JSON body whose `from` is `EMAIL_FROM` (default `EquityCairn <onboarding@resend.dev>`), `to` is `[address]`, and whose `text` and `html` both contain `http://localhost:3000/join-beta/verify?token=<raw>` (default `SITE_URL`, trailing slash on a custom `SITE_URL` handled); returns `true` for 200; returns `false` for a 422 response, for a rejected fetch, and when `RESEND_API_KEY` is unset (fetch not called). In the failure cases `console.error` output must contain neither the address nor the token.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/signup src/lib/email` — Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** the four modules with Node `crypto` (`randomBytes(32).toString("base64url")`, `createHash("sha256")`), reading env at call time. Subject `Confirm your EquityCairn beta sign-up`; text and HTML bodies are short and plain (brand name, one sentence, the link, "If you didn't sign up, ignore this email"). Log failures as a fixed string plus HTTP status or error message only.
- [ ] **Step 4: Run** the same command — Expected: PASS. Also add `RESEND_API_KEY=`, `EMAIL_FROM=`, `SITE_URL=` (with a comment giving the defaults) to `.env.example`.
- [ ] **Step 5: Commit** `feat: add token, client key and verification email helpers`.

### Task 3: Server-only signup store

**Files:**

- Create: `src/lib/signup/store.ts`
- Test: `src/lib/signup/store.test.ts`

**Interfaces:**

- Consumes: `getSupabaseAdmin`, `generateToken`, `hashToken`, constants (Task 2), Task 1 schema and `check_signup_rate_limit` via `.rpc`.
- Produces (all `import "server-only"`, all take/return plain data, none send email or log):
  - `checkSignupRateLimit(key: string): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }>` (rpc with window `COOLDOWN_SECONDS`; result `0` ⇒ allowed).
  - `registerSignup(email: string): Promise<{ manageToken: string; verifyToken: string | null }>` — inserts `{ email, source: "landing" }` or finds the row by `lower(email)` after a `23505`; always sets a fresh manage token hash; when the row is unverified and `last_email_sent_at` is null or older than `COOLDOWN_SECONDS`, also sets a fresh verify token hash, `verify_expires_at = now + VERIFY_TTL_HOURS`, `last_email_sent_at = now` and returns the raw verify token; otherwise `verifyToken` is `null`. Throws on database errors.
  - `getSignupStatus(rawManageToken: string): Promise<{ cooldownRemainingSeconds: number } | null>` — `null` for an unknown token; the remaining cooldown is `0` for verified rows.
  - `issueResend(rawManageToken: string): Promise<{ status: "sent"; verifyToken: string } | { status: "cooldown"; retryAfterSeconds: number } | { status: "noop" } | { status: "invalid" }>` — `noop` for a verified row; `sent` rotates the verify token like `registerSignup`.
  - `verifyEmail(rawVerifyToken: string): Promise<"verified" | "already_verified" | "invalid">` — hashes the token; unknown ⇒ `invalid`; row already has `verified_at` ⇒ `already_verified` (ignore expiry); `verify_expires_at` in the past ⇒ `invalid`; otherwise set `verified_at = now` and return `verified`. The verify hash is **kept** after verifying so a second click reports `already_verified` (controller ruling; the design's "cleared on use" wording is superseded).

- [ ] **Step 1: Write failing tests** against a hand-rolled fake of the Supabase query builder (mock `@/lib/supabase/server`) or an in-memory fake table, whichever keeps the tests behavioural: `checkSignupRateLimit` maps rpc `0` to allowed and `37` to `{allowed:false, retryAfterSeconds:37}`; `registerSignup` for a new address returns both tokens and stores only hashes (the raw tokens never appear in any stored value); a repeat within the cooldown returns a new `manageToken` and `verifyToken: null`; a repeat after the cooldown (fake the clock with `vi.useFakeTimers`) returns a verify token again; a verified address returns `verifyToken: null` and a manage token; `getSignupStatus` is `null` for an unknown or verify-type token and reports the remaining seconds; `issueResend` covers `sent`, `cooldown` (with remaining seconds), `noop` (verified) and `invalid`; `verifyEmail` covers `verified`, second call `already_verified`, expired ⇒ `invalid`, unknown ⇒ `invalid`, and a **manage token ⇒ `invalid`**.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/signup/store.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `store.ts`. Use single-row updates filtered by hash columns; keep each exported function small; throw (do not log) on unexpected database errors so the action layer decides what to log.
- [ ] **Step 4: Run** the test — Expected: PASS.
- [ ] **Step 5: Commit** `feat: add signup store with token and rate limit logic`.

### Task 4: Server actions (`joinBeta` redirect, `resendVerification`)

**Files:**

- Modify: `src/app/actions/join-beta.ts`, `src/lib/signup/types.ts`, `src/app/actions/join-beta.test.ts`
- Create: `src/app/actions/resend-verification.ts`, `src/app/actions/resend-verification.test.ts`

**Interfaces:**

- Consumes: Task 2 and Task 3 exports.
- Produces: `JoinBetaResult = { ok: true } | { ok: false; error: "invalid_email" | "server_error" } | { ok: false; error: "rate_limited"; retryAfterSeconds: number }` (types.ts). `joinBeta(prev, formData)` keeps its signature. `ResendResult = { ok: true; retryAfterSeconds: number } | { ok: false; error: "cooldown"; retryAfterSeconds: number } | { ok: false; error: "invalid_token" | "server_error" }` exported from `types.ts`; `resendVerification(token: string): Promise<ResendResult>` (`"use server"`).

- [ ] **Step 1: Write failing tests** (mock `@/lib/signup/store`, `@/lib/email/verification-email`, `next/headers`, and `next/navigation`'s `redirect` as a function that throws a sentinel error; assert on the sentinel/arguments). `joinBeta`: honeypot ⇒ `{ok:true}` with no store calls; invalid email ⇒ `invalid_email` with no store calls; rate-limited ⇒ `{ok:false,error:"rate_limited",retryAfterSeconds}` and `registerSignup` not called; success ⇒ `registerSignup` called with the normalised email, the email sent with the raw verify token, then `redirect("/join-beta?token=<manageToken>")`; **verified/unverified duplicate parity**: `verifyToken: null` ⇒ no email sent, same redirect target shape; email send returning `false` or throwing ⇒ still redirects; store throwing ⇒ `{ok:false,error:"server_error"}`, `console.error` output contains neither the email nor any token. `resendVerification`: `sent` ⇒ sends email, returns `{ok:true,retryAfterSeconds:60}`; `noop` ⇒ same `{ok:true,retryAfterSeconds:60}` without sending; `cooldown` ⇒ `{ok:false,error:"cooldown",retryAfterSeconds}`; `invalid` or a non-string/empty token ⇒ `invalid_token`; send failure after `sent` ⇒ still `{ok:true,…}`; store throwing ⇒ `server_error`.
- [ ] **Step 2: Run** `pnpm vitest run src/app/actions` — Expected: FAIL.
- [ ] **Step 3: Implement.** `joinBeta`: after the honeypot and validation, derive the key with `getClientKey(await headers())`, call `checkSignupRateLimit`, then `registerSignup`; send the email (`void`-safe: catch and ignore failures) only when a verify token is returned; call `redirect(...)` **outside** the `try` block. `resendVerification` follows the spec table. Keep logging to fixed strings, error codes or messages without addresses/tokens.
- [ ] **Step 4: Run** the tests — Expected: PASS.
- [ ] **Step 5: Commit** `feat: redirect sign-ups to join-beta and add resend action`.

### Task 5: `/join-beta` and `/join-beta/verify` pages

**Files:**

- Create: `src/app/join-beta/page.tsx`, `src/app/join-beta/verify/page.tsx`, `src/components/join-beta/resend-button.tsx`
- Test: `src/components/join-beta/resend-button.test.tsx`, `src/app/join-beta/page.test.tsx`, `src/app/join-beta/verify/page.test.tsx`; extend `e2e/home.spec.ts` or add `e2e/join-beta.spec.ts`

**Interfaces:**

- Consumes: `getSignupStatus`, `verifyEmail` (Task 3), `resendVerification`, `ResendResult` (Task 4).
- Produces: `ResendButton({ token, initialCooldownSeconds }: { token: string; initialCooldownSeconds: number })` (client). Server pages `JoinBetaPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> })` and `VerifyPage` with the same prop shape; both export `metadata` with `robots: { index: false, follow: false }`.

- [ ] **Step 1: Write failing tests.** `ResendButton` (fake timers, mocked action): renders disabled with text matching `Re-send available in 0:42` for `initialCooldownSeconds=42`, counts down each second, becomes enabled at 0 with the label "Re-send email"; clicking calls `resendVerification(token)` once, shows a pending state, then restarts the countdown from the returned `retryAfterSeconds`; a `cooldown` result restarts the countdown from the server's value; `server_error`/`invalid_token` show an inline error and keep the button usable; a double click while pending calls the action once. `/join-beta` page (mock the store; render the async server component's result): valid token ⇒ heading "Check your email" and the resend button with the server's remaining cooldown; unknown, missing, or array token ⇒ "This link isn't valid" with a link home (`/`) and no resend button; the page text never contains the email address or the word "verified". `/join-beta/verify` page: `verified` ⇒ success message; `already_verified` ⇒ "already verified" message; `invalid` or missing/array token ⇒ "invalid or expired" message with a link to `/#join`. E2E (no database needed): `/join-beta` and `/join-beta/verify` with no token and with a junk token render their invalid states without errors.
- [ ] **Step 2: Run** `pnpm vitest run src/components/join-beta src/app/join-beta` — Expected: FAIL.
- [ ] **Step 3: Implement** the two pages as server components (read `searchParams` per the Next 16 docs; normalise `string | string[] | undefined` to a single string, rejecting arrays) and `ResendButton`, composing existing shadcn `Card`, `Button`, `Spinner`, `FieldError`/plain text with semantic tokens, correct in light and dark, with an `aria-live="polite"` region for result messages. Reuse the site header/footer so the pages match the brand.
- [ ] **Step 4: Run** the unit tests and `pnpm test:e2e` (stop and use a different port if a foreign dev server holds :3000; never kill it) — Expected: PASS.
- [ ] **Step 5: Commit** `feat: add join-beta and verify pages`.

### Task 6: Form handling, docs and end-to-end verification

**Files:**

- Modify: `src/components/signup-form.tsx`, `src/components/signup-form.test.tsx`, `README.md`, `.env.example` (if not complete)

**Interfaces:**

- Consumes: the extended `JoinBetaResult` (Task 4).

- [ ] **Step 1: Write failing tests** in `signup-form.test.tsx`: a `rate_limited` result shows "Please wait a minute before trying again", keeps the typed email, and is cleared when the user edits the field; existing server-error, double-submit and honeypot tests still pass (the honeypot path and the inline "You're on the list" success remain for the `{ ok: true }` result).
- [ ] **Step 2: Run** `pnpm vitest run src/components/signup-form.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** the new message branch in `SignupForm` (a successful non-honeypot sign-up now navigates away via the server action's redirect; no client change needed for that).
- [ ] **Step 4: README**: document `RESEND_API_KEY`, `EMAIL_FROM`, `SITE_URL`, the test-sender limitation (only the Resend account's own address receives mail until a domain is verified), the new migration, and the sign-up/verify flow in a short section; update the Docker/Cloud Run notes (`SITE_URL` must be the public URL on deploy).
- [ ] **Step 5: Run the full checks** (`pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `env -u SUPABASE_URL -u SUPABASE_SECRET_KEY -u RESEND_API_KEY pnpm build`).
- [ ] **Step 6: Real-service check (owner-run)** — requires the owner's real `RESEND_API_KEY` and secret key in `.env.local` (check only for non-empty with `grep -c`, never print). If either is blank mark this step NOT VERIFIED. Otherwise: sign up with the Resend account's own email → redirected to `/join-beta?token=…` → email arrives → link opens `/join-beta/verify` and verifies → second click says already verified → `select email, verified_at from public.beta_signups` shows the row verified → immediate second sign-up from the same machine shows the one-minute message → re-send button counts down from the server value and survives a refresh → clean up test rows (`beta_signups`, `signup_rate_limits`).
- [ ] **Step 7: Commit** `feat: handle rate limit in sign-up form and document email verification`.

---

## Self-review notes

- Spec coverage: flow + redirect (T4, T5), two tokens (T1, T3), hashed storage (T1–T3), atomic throttle (T1, T3, T4), cooldown + countdown (T3, T5), email via Resend test sender (T2), no enumeration (T3–T5), send failure tolerance (T2, T4), config/docs (T2, T6), real-service checks (T6).
- Controller ruling recorded in Task 3: verify hash is kept after use so the second click reports "already verified" (the spec's "single use / cleared" line and "already verified on second click" line conflicted; idempotent verification wins).
- Not planned (spec non-goals): custom domain, unsubscribe, marketing email, admin UI, CAPTCHA.
