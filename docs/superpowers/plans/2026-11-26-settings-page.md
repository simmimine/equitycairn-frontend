# Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/settings` page for profile, appearance, account security, a subscription placeholder, bug reports and privacy, reached from the feed.

**Architecture:** Server component `SettingsContent` gates the session and renders a client `SettingsApp` that takes its server actions as props (so e2e can pass fakes). Password change and deletion go through our own one-time emailed links, handled with the service role. Database changes are one new migration.

**Tech Stack:** Next.js 16.4, React 19, Supabase (`@supabase/ssr`, supabase-js 2.119), Resend, zod, next-themes, shadcn on Base UI, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-26-settings-page-design.md`

## Global Constraints

- pnpm only. Read `node_modules/next/dist/docs/` before Next-specific code (AGENTS.md).
- Use `trail ask "<task>" --source` to locate code; run `trail check` before each commit.
- shadcn components and existing theme tokens; no design board. Text never below 11px. Phone to wide desktop, light and dark, keyboard operable.
- Every server action re-checks the session itself. Never log email addresses, tokens or report text.
- Link lifetime 30 minutes, single use, one live link per user per purpose.
- Limits: link requests 3 per 600s per account; confirmations 10 per 600s per client; bug reports 5 per 3600s per account.
- Bug report fields max 2000 characters each.
- Subscription copy, exactly: "Subscriptions are coming soon." No controls.
- Do **not** apply the migration to the live project, push, or change dashboard settings without the owner's go-ahead.
- Commit messages end with the repo's `Co-Authored-By` line. Stay on `docs/settings-page-brainstorm` or a branch from it.

## Review Focus

1. A link opened in a browser signed in as a **different** account: the action applies to the link's account only and the other session stays signed in (Task 4).
2. Double click or two tabs on a confirm button: exactly one run; the other sees the "link no longer works" message (Tasks 3, 5).
3. A too-short or mismatched new password: the link is **not** used up (Task 4).
4. Bug text that is only whitespace, contains NUL characters, or HTML: rejected, stripped (Postgres refuses NUL), escaped (Task 7).
5. Session expired while Settings is open: pressing any button shows a sign-in message and typed text survives (Task 8).

## File Structure

| Path | Responsibility |
|---|---|
| `supabase/migrations/20261126000000_settings.sql` | tokens, bug reports, email lock, session end and account delete functions |
| `src/lib/account/links.ts` | issue, peek, consume one-time tokens |
| `src/lib/account/admin.ts` | set password, end sessions, delete account |
| `src/lib/email/account-link-email.ts`, `bug-report-email.ts` | the two emails |
| `src/lib/bugs/schema.ts`, `store.ts` | report validation and insert |
| `src/app/actions/account-link.ts`, `settings.ts`, `bug-report.ts` | server actions |
| `src/app/account/confirm/{page,confirm-content}.tsx` | link landing page |
| `src/components/account/confirm-view.tsx` | password form / delete button |
| `src/app/settings/{page,settings-content}.tsx` | route |
| `src/components/settings/` | `settings-app`, `settings-header`, one file per section |
| `src/app/e2e-settings/{page,harness}.tsx` | fake-action harness |

---

### Task 1: Hidden session cookie and two kinds of sign out

**Files:**
- Modify: `src/lib/auth/session.ts`, `src/proxy.ts`, `src/lib/auth/accounts.ts` (`signOutSession`), `src/app/actions/login.ts` (`signOut`)
- Test: `src/lib/auth/session.test.ts`, `src/lib/auth/accounts.test.ts`, `src/app/actions/login.test.ts`, `src/proxy.test.ts` (extend or create)

**Interfaces:**
- Produces: `SESSION_COOKIE_OPTIONS = { httpOnly: true } as const` in `src/lib/auth/constants.ts`; `signOutSession(scope: "local" | "global"): Promise<void>`; actions `signOut(): Promise<void>` (local) and `signOutEverywhere(): Promise<void>` (global), both redirecting to `/`.

- [ ] **Step 1: Failing tests**
  - session and proxy (mock `createServerClient`): `expect(options.cookieOptions).toEqual({ httpOnly: true })`.
  - accounts: `signOutSession("local")` calls `auth.signOut({ scope: "local" })`; same for `"global"`.
  - login actions: `signOut()` calls `signOutSession("local")`; `signOutEverywhere()` calls `signOutSession("global")`; both reject with `NEXT_REDIRECT:/`.
- [ ] **Step 2:** `pnpm test src/lib/auth src/app/actions/login src/proxy` → FAIL.
- [ ] **Step 3:** Pass `cookieOptions: SESSION_COOKIE_OPTIONS` to both `createServerClient` calls; add the scope parameter and the new action.
- [ ] **Step 4:** Same command → PASS. `grep -rn "createBrowserClient" src` → no output.
- [ ] **Step 5: Commit** `feat: hide the session cookie from scripts and sign out per device`

### Task 2: Database migration

**Files:** Create: `supabase/migrations/20261126000000_settings.sql` (follow the style of `20261124000000_beta_login.sql`)

**Interfaces (produces):**
- `account_action_tokens(user_id uuid references auth.users on delete cascade, purpose text check in ('password_change','account_delete'), token_hash text not null unique, expires_at timestamptz not null, created_at timestamptz not null default now(), primary key (user_id, purpose))`
- `bug_reports(id uuid pk default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, what_happened text not null check 1..2000, expected text check ≤2000, page_path text check ≤200, browser text check ≤500, screen text check ≤11, status text not null default 'new' check in ('new','looking','fixed'), created_at timestamptz not null default now())`
- `end_user_sessions(p_user_id uuid) returns void` — deletes from `auth.sessions`.
- `delete_account(p_user_id uuid) returns void` — in one transaction deletes `beta_signups` matching `lower(email)` of that user, then the `auth.users` row. (A delete trigger would be wrong: `createPendingAccount` deletes unconfirmed users and must keep their beta sign-up.)
- `refuse_email_change()` + trigger `before update of email on auth.users` raising when `new.email is distinct from old.email`.

- [ ] **Step 1:** Write the migration. Both tables: RLS enabled, no policies, `revoke all ... from public, anon, authenticated`, grants to `service_role` only. Functions: `security definer`, `set search_path = ''`, `revoke all` from `public, anon, authenticated`, execute granted to `service_role`.
- [ ] **Step 2:** Verify. If a local Supabase stack is available, `supabase db reset` → no errors; then check that an `update auth.users set email=...` raises. If not available, say so in the task report; it is checked in Task 10's manual pass.
- [ ] **Step 3: Commit** `feat: add settings tables and account functions`

### Task 3: Link tokens, account admin calls and the link email

**Files:**
- Create: `src/lib/account/links.ts`, `src/lib/account/admin.ts`, `src/lib/email/account-link-email.ts` and a `.test.ts` beside each
- Modify: `src/lib/auth/constants.ts`

**Interfaces:**
- Consumes: `generateToken`, `hashToken` (`@/lib/signup/tokens`); `getSupabaseAdmin`; `sendEmail`, `getSiteUrl`, `escapeHtml` (`@/lib/email/send`).
- Produces (all `server-only`; database errors throw):
  - `type LinkPurpose = "password_change" | "account_delete"`; `ACCOUNT_LINK_TTL_MINUTES = 30`
  - `issueLink(userId: string, purpose: LinkPurpose, now?: Date): Promise<string>` (raw token)
  - `peekLink(raw: string, now?: Date): Promise<{ userId: string; purpose: LinkPurpose } | null>` (read only)
  - `consumeLink(raw: string, purpose: LinkPurpose, now?: Date): Promise<{ userId: string } | null>`
  - `setPassword(userId, password): Promise<void>` (admin `updateUserById`, then rpc `end_user_sessions`)
  - `deleteAccount(userId): Promise<void>` (rpc `delete_account`)
  - `sendAccountLinkEmail(to: string, purpose: LinkPurpose, rawToken: string): Promise<boolean>`

- [ ] **Step 1: Failing tests**
  - `issueLink` upserts on `user_id,purpose` with `token_hash === hashToken(raw)` (never the raw value) and `expires_at` = now + 30 min.
  - `consumeLink` is a single `delete` filtered by `token_hash`, `purpose` and `expires_at > now`, returning rows; no row → `null`. A second call after the row is gone → `null`.
  - `peekLink` never calls delete or update; expired → `null`.
  - `setPassword` calls update then `end_user_sessions`; an update error throws and skips the rpc.
  - email: link is `${SITE_URL}/account/confirm?token=<raw>`; subjects "Change your EquityCairn password" / "Confirm deleting your EquityCairn account"; text says it lasts 30 minutes and to ignore it if you didn't ask; `getSiteUrl()` null → `false`, nothing sent.
- [ ] **Step 2:** `pnpm test src/lib/account src/lib/email` → FAIL.
- [ ] **Step 3:** Implement (model the email on `confirm-email.ts`).
- [ ] **Step 4:** → PASS. **Step 5: Commit** `feat: add one-time account links`

### Task 4: Link actions

**Files:**
- Create: `src/app/actions/account-link.ts`, `account-link.test.ts`
- Modify: `src/lib/auth/attempts.ts` (scope union gains `"account-link" | "account-confirm" | "bug-report"`), `src/lib/auth/constants.ts`

**Interfaces:**
- Consumes: Task 3; `getUser`, `signOutSession`, `checkAttempts`, `getClientKey`, `validatePassword`.
- Produces:
  - `ACCOUNT_LIMITS = { link: { max: 3, windowSeconds: 600 }, confirm: { max: 10, windowSeconds: 600 }, bug: { max: 5, windowSeconds: 3600 } }`
  - `requestAccountLink(purpose: LinkPurpose): Promise<{ ok: true; email: string } | { ok: false; error: "unauthenticated" | "invalid" | "send_failed" | "server_error" } | { ok: false; error: "rate_limited"; retryAfterSeconds: number }>`
  - `type ConfirmResult = { ok: true } | { ok: false; error: "expired" | "server_error" } | { ok: false; error: "password"; passwordError: <error of PasswordResult> } | { ok: false; error: "rate_limited"; retryAfterSeconds: number }`
  - `confirmPasswordChange(token: string, password: string, confirm: string): Promise<ConfirmResult>`
  - `confirmAccountDeletion(token: string): Promise<ConfirmResult>`

- [ ] **Step 1: Failing tests**
  - request: signed out → `unauthenticated`, no token issued; unknown purpose string → `invalid`; sends to the **session's** email; limit key is `account-link:<user.id>`; send returns false → `send_failed`.
  - confirm: invalid password → `password` error and `consumeLink` not called; mismatch likewise.
  - confirm: `consumeLink` null → `expired`, no password set / nothing deleted.
  - confirm works with no session (`getUser` → null).
  - success with the same user signed in → `signOutSession("local")` called; signed in as another user → **not** called.
  - delete passes `"account_delete"` to `consumeLink`; password passes `"password_change"`.
  - thrown errors → `server_error`; the log line contains no token or email.
- [ ] **Step 2:** `pnpm test src/app/actions/account-link` → FAIL.
- [ ] **Step 3:** Implement. Order: validate input, rate limit, read current user, consume, act, clear the local session if it is the same user (a failure there is ignored).
- [ ] **Step 4:** → PASS. **Step 5: Commit** `feat: confirm password change and deletion by emailed link`

### Task 5: Confirm page

**Files:**
- Create: `src/app/account/confirm/page.tsx`, `confirm-content.tsx`, `confirm-content.test.tsx`, `src/components/account/confirm-view.tsx`, `confirm-view.test.tsx`

**Interfaces:**
- Consumes: `peekLink`, Task 4 actions; `LinkScreen` and the shell used by `src/app/auth/confirm`.
- Produces: `ConfirmView({ purpose, token, changePassword, deleteAccount })` with the two actions as props.

- [ ] **Step 1: Failing tests**
  - content: token not matching `/^[A-Za-z0-9_-]{43}$/`, or repeated, or `peekLink` null → title "This link no longer works", text "Request a new one from Settings."; valid → the view for the stored purpose; rendering calls no action.
  - view: password purpose has "New password" and "Confirm new password" fields; delete purpose says it is permanent and has a "Delete my account" button; nothing runs before a press; button disabled while pending (two clicks → one call).
  - view: password success → "Password changed" with a link to `/login`; delete success → "Account deleted" with a link to `/`; `expired` → the same invalid message; password errors keep the form.
- [ ] **Step 2:** `pnpm test account` → FAIL.
- [ ] **Step 3:** Implement, following `auth/confirm` (Suspense around a content component). Page metadata: `robots: { index: false, follow: false }`, `referrer: "strict-origin"` — it keeps the token out of every referrer; `no-referrer` would send `Origin: null` and Next would reject the server action.
- [ ] **Step 4:** → PASS. **Step 5: Commit** `feat: add the account confirmation page`

### Task 6: Profile action

**Files:** Create: `src/app/actions/settings.ts`, `settings.test.ts`. Modify: `src/lib/onboarding/schema.ts`, `src/components/onboarding/onboarding-flow.tsx` (move its role and experience label lists)

**Interfaces:**
- Consumes: `getProfile`, `saveName`, `saveAbout`, `parseName`, `parseAbout`.
- Produces: `ROLE_OPTIONS`, `EXPERIENCE_OPTIONS: readonly (readonly [string, string])[]` exported from `schema.ts`; `saveProfileAction(input: { firstName: string; lastName: string; role: string; experience: string }): Promise<{ ok: true } | { ok: false; error: "unauthenticated" | "invalid" | "server_error" }>`

- [ ] **Step 1: Failing tests:** signed out → `unauthenticated`; not onboarded → `invalid`; bad name (`""`, `"<b>"`, 61 chars) or unknown role → `invalid` and **nothing** saved; `"skip"` saves `null`; success saves trimmed values and calls `revalidatePath("/feed")` and `revalidatePath("/settings")`.
- [ ] **Step 2:** `pnpm test src/app/actions/settings` → FAIL. **Step 3:** Implement.
- [ ] **Step 4:** `pnpm test src/app/actions/settings src/components/onboarding` → PASS. **Step 5: Commit** `feat: let users edit their profile`

### Task 7: Bug reports

**Files:** Create: `src/lib/bugs/schema.ts`, `src/lib/bugs/store.ts`, `src/lib/email/bug-report-email.ts`, `src/app/actions/bug-report.ts`, tests beside each. Modify: `.env.example`

**Interfaces:**
- Produces:
  - `type BugInput = { whatHappened: string; expected: string; pagePath: string; browser: string; screen: string }`
  - `type BugReport = { whatHappened: string; expected: string | null; pagePath: string | null; browser: string | null; screen: string | null }`
  - `parseBugReport(input: unknown): { ok: true; report: BugReport } | { ok: false }`
  - `parsePagePath(value: unknown): string | null` — in-app path only: `^/(?!/)[A-Za-z0-9/_-]{0,199}$`
  - `insertBugReport(userId: string, report: BugReport): Promise<void>` (service role)
  - `sendBugReportEmail(report: BugReport, reporter: { id: string; email: string }): Promise<boolean>`
  - `reportBugAction(input: BugInput): Promise<{ ok: true } | { ok: false; error: "unauthenticated" | "invalid" | "server_error" } | { ok: false; error: "rate_limited"; retryAfterSeconds: number }>`

- [ ] **Step 1: Failing tests**
  - parse: whitespace-only or >2000 → not ok; `"\u0000"` stripped from every field; empty `expected` → `null`; `pagePath` of `"//evil.com"`, `"https://x"` or `"/feed?q=1"` → `null`; `screen` not `^\d{1,5}x\d{1,5}$` → `null`; `browser` cut to 500. A bad optional detail never rejects the report.
  - email: goes to `BUG_REPORT_EMAIL`; `<script>` appears escaped in `html`; unset variable → `false`, nothing sent.
  - action: signed out → `unauthenticated`; limit key `bug-report:<user.id>`; insert happens before the email; insert failure → `server_error`, no email; email returns false or throws → still `{ ok: true }`.
- [ ] **Step 2:** `pnpm test bug` → FAIL.
- [ ] **Step 3:** Implement; send inside `after()` as `login.ts` does. Add `BUG_REPORT_EMAIL=` and `SUPPORT_EMAIL=` to `.env.example` with a comment each. Put no real address in the repo.
- [ ] **Step 4:** → PASS. **Step 5: Commit** `feat: save bug reports and email the owner`

### Task 8: The settings page

**Files:** Create: `src/app/settings/page.tsx`, `settings-content.tsx` (+test); `src/components/settings/settings-app.tsx`, `settings-header.tsx`, `profile-section.tsx`, `appearance-section.tsx`, `account-section.tsx`, `subscription-section.tsx`, `bug-section.tsx`, `privacy-section.tsx` (+tests). Modify: `src/proxy.ts` (matcher gains `"/settings/:path*"`), `src/components/feed/tab-bar.tsx`

**Interfaces:**
- Consumes: Tasks 1, 4, 6, 7.
- Produces:
  - `type SettingsActions = { saveProfile: typeof saveProfileAction; requestLink: typeof requestAccountLink; reportBug: typeof reportBugAction; signOut: () => void | Promise<void>; signOutEverywhere: () => void | Promise<void> }`
  - `SettingsApp({ profile: { firstName: string; lastName: string; role: string | null; experience: string | null }, email: string, supportEmail: string | null, fromPath: string | null, actions: SettingsActions })`
  - `TabBar({ current }: { current: "feed" | "profile" })`, default `"feed"`; Profile becomes a `Link` to `/settings?from=/feed` (`/settings` when current). Watchlist and Saved stay "coming soon".

- [ ] **Step 1: Failing tests**
  - content: not onboarded → redirect `/onboarding`; passes the session email, `SUPPORT_EMAIL || null`, and `parsePagePath(searchParams.from)`; key is `user.id`.
  - app: six sections, headings in order: Profile, Appearance, Account and security, Subscription, Report a bug, Privacy and help; section links jump to each.
  - profile: pre-filled; role and experience offer "Prefer not to say" (value `skip`); success and error messages announced.
  - appearance: radio group Light / Dark / System calls `setTheme("light" | "dark" | "system")`; no selection marked before mount (avoids hydration mismatch).
  - account: email read only; "Change password" and "Delete account" call `requestLink` with the purpose and then show "We sent a link to <email>. It lasts 30 minutes."; send failure and rate limit are shown; "Sign out" and "Sign out of all devices" call the matching action.
  - subscription: exactly "Subscriptions are coming soon." and no button, link or input in the section.
  - bug: states that the previous page, browser and screen size are attached; submits `fromPath`, `navigator.userAgent`, `` `${innerWidth}x${innerHeight}` ``; clears only on success.
  - every section: an `unauthenticated` result shows "Your session has ended." with a link to `/login`; typed text is still there.
  - privacy: lists name, email, role, experience, watchlist, bug reports; says no investment advice; support line absent when `supportEmail` is null.
  - tab bar: Profile is a link; `current="profile"` gives it `aria-current="page"`.
  - proxy: matcher contains `/settings/:path*`.
- [ ] **Step 2:** `pnpm test settings tab-bar proxy` → FAIL.
- [ ] **Step 3:** Implement. Follow `feed-content.tsx` and `feed/page.tsx` for the route. Wrap in `ComingSoonProvider` (the tab bar needs it). Header: wordmark link to `/feed` and `AccountMenu`, no search. From `md` a link list left, panels right; phones stacked with bottom padding clear of the tab bar. Reuse `OptionCards`, `Field`, `Input`, `Textarea`, `Button`, `SURFACE`. Disable submit buttons while pending.
- [ ] **Step 4:** → PASS; `pnpm typecheck && pnpm lint` clean. **Step 5: Commit** `feat: add the settings page`

### Task 9: Entry points from the feed

**Files:** Modify: `src/components/feed/account-menu.tsx`, `sidebar.tsx` and their tests

**Interfaces:** `AccountMenu` gains `settingsHref?: string` (default `"/settings?from=/feed"`); `SettingsHeader` passes `"/settings"`.

- [ ] **Step 1: Failing tests:** menu has a "Settings" link above "Sign out" with that href, and clicking it closes the menu; the sidebar's whole profile row is one link to `/settings?from=/feed` named with the user's name (or "Your account") with a visible focus ring; "Manage" still shows "coming soon".
- [ ] **Step 2:** `pnpm test src/components/feed` → FAIL. **Step 3:** Implement; keep the sidebar's sticky profile behaviour and `useHeightVariable` ref.
- [ ] **Step 4:** → PASS. **Step 5: Commit** `feat: open settings from the feed`

### Task 10: End-to-end tests and release checks

**Files:** Create: `src/app/e2e-settings/page.tsx`, `harness.tsx`, `e2e/settings.spec.ts`. Modify: `playwright.config.ts` (`E2E_FAKE_SETTINGS: "1"`), `e2e/global-setup.ts` (add `/settings`, `/account/confirm`, `/e2e-settings`), `e2e/feed.spec.ts` (entry points)

**Interfaces:** `/e2e-settings` (404 unless `E2E_FAKE_SETTINGS === "1"`, pattern of `e2e-feed`); `?view=confirm-password|confirm-delete` renders `ConfirmView`; fakes record into `window.__authCalls`.

- [ ] **Step 1:** Specs (both Playwright projects): all six sections visible; save profile; theme switch sets the `dark` class; request each link; submit a bug; both confirm views do nothing until pressed; no horizontal scroll at 320px; from the feed, the menu link, sidebar row (desktop) and Profile tab (phone) reach settings.
- [ ] **Step 2:** `pnpm test:e2e` → PASS. If a dev server is already running, use `pnpm build && pnpm start --port 3100` (see learnings).
- [ ] **Step 3:** `pnpm test && pnpm typecheck && pnpm lint && pnpm format:check && pnpm build` → all pass.
- [ ] **Step 4: Commit** `test: cover the settings page end to end`
- [ ] **Step 5: Owner's release checks** (report these as outstanding; do not do them unasked):
  - Apply the migration to the live project.
  - Set `BUG_REPORT_EMAIL`, `SUPPORT_EMAIL`, `SITE_URL`, `RESEND_API_KEY` in the deployment; verify a Resend domain, or mail reaches only the Resend account's address.
  - Turn on "Require current password when changing"; confirm a direct password change without it is refused and the emailed-link change still works.
  - Real project pass: both emails arrive; password change ends sessions on another device; deletion removes profile, watchlist, bug reports and beta sign-up; changing an email directly is refused; sign-in, refresh and sign-out work with the `httpOnly` cookie.
