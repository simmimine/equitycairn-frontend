# Beta-only login, account creation and first-run onboarding — design

Status: awaiting approval. Date: 2026-11-23. Builds on `2026-11-23-email-verification-design.md` (merged, PR #3).
Onboarding content comes from the Notion page "EquityCairn — Onboarding Flow" (MVP = steps 1–4); first-session landing from "First Session Landing and News Sources".

## Intent

Only people who joined the beta list **and verified their address** may have an account. They log in at `/login`, create a password the first time, confirm their email, answer a short onboarding, and land on their authed home: the watchlist newsfeed. Returning users just sign in.

## The flow (the owner's decisions)

Cards on `/login`, one at a time:

1. **Email card.** User enters their email. The server answers one of four ways, shown plainly (the owner chose clear messages over hiding membership):
   - **Not on the beta list** → "This email isn't on the beta list yet" + link to `/#join`.
   - **On the list, not verified** → "Verify your beta sign-up first" + a **Re-send verification** button (60 s cooldown, the existing mechanism, keyed by email).
   - **Verified, no account** → card 2a.
   - **Has an account** → card 2b.
2. **2a. Create password:** password + confirm. Submitting creates an *unconfirmed* account and emails a confirmation link; the card becomes "Check your email" with a re-send button (60 s cooldown).
2. **2b. Sign in:** password. Success → authed home.
3. **Confirmation link** (`/auth/confirm?token_hash=…`): opens a page that asks the user to **re-enter the password they just created**, then confirms the account, signs them in, and sends them to onboarding. (Why: see "Pre-registration" below.)
4. **Onboarding** (first sign-in only), then **authed home** (`/feed`).

Onboarding (Notion MVP, steps 1–4), one card each, Back allowed:
1. **Name** — first and last name, length-limited and validated (letters, spaces, `' - .`, 1–60 chars), always rendered as text, never as HTML.
2. **About you** — Role (Retail investor / Institutional investor / Researcher or analyst / Financial adviser or wealth professional / Other) and Experience (Beginner / Intermediate / Experienced). Both optional; "Prefer not to say"/Skip on each. Editable later (settings page is out of scope; the data model supports it).
3. **Welcome** — what EquityCairn is: it organizes company news and links to publishers; no "all news" or "real-time" claims.
4. **Starter watchlist** — add tickers; can be skipped (the feed then shows an empty state with "Add companies"). Changeable anytime.

Then redirect to `/feed`.

## Goals

- Only verified beta members can ever hold an account, enforced in more than one place.
- A password account is not usable until the real owner of the inbox confirms it.
- Sessions that survive reloads, with protected pages that really check the session on the server.
- First-time users are taken through onboarding exactly once; returning users go straight to `/feed`.
- Reuse what exists: the Resend sender, the database-backed throttle function, the card shell and UI components, `beta_signups`.

## Non-goals

- Password reset / "forgot password" (needed soon; separate small feature — the sign-in card gets no link yet).
- Social login, magic links, MFA, account deletion, change email/password.
- Settings page (names/role/experience editing), source toggles, billing.
- The actual newsfeed. `/feed` is an authed placeholder with the watchlist and an empty state; ingestion and ranking are a separate feature.
- Company search/autocomplete in step 4 (there is no securities data source yet): users type tickers (format-checked); search arrives with the feed work.
- Custom domain/DKIM (the Resend test sender limitation from the previous feature still applies).

## Anti-goals

- Anyone outside the verified beta list obtaining an account, by any path — including calling Supabase's public sign-up API directly with the publishable key.
- **Pre-registration takeover:** an attacker who types a member's email and picks a password, then gets the member to click the confirmation mail, ends up with a confirmed account whose password the attacker knows. Must be impossible.
- A confirmation link that confirms merely by being opened (mail scanners prefetch links).
- Logging passwords, raw tokens or email addresses.
- Treating `proxy.ts` as the security boundary.

## Constraints

- Next.js 16 conventions apply (see `AGENTS.md`): middleware is now `proxy.ts`, and per `node_modules/next/dist/docs/01-app/02-guides/authentication.md` the proxy only does optimistic checks; every protected page/action re-verifies the session in server code next to the data. The builder must read the bundled docs (authentication, proxy, cookies) before writing code.
- Package manager is pnpm. UI uses the existing shadcn/Base UI components and `JoinBetaShell`-style layout, light and dark.
- Throttling and cooldowns live in the database (multiple Cloud Run instances), as before.
- No new secrets beyond what exists; Supabase keys stay server-side except the publishable key.

## Approaches considered

1. **Supabase Auth using its own confirmation email.** Least code, but Supabase's built-in mailer is limited to a few mails per hour and its template isn't ours; we'd have to configure Resend as custom SMTP and the confirm-link behavior is its default (opens = confirms).
2. **Supabase Auth for passwords and sessions, with our own confirmation email (chosen — my call; the owner left the mechanism open).** Supabase stores password hashes and issues sessions; our server action checks the beta list, creates the unconfirmed user and sends the confirm link through the existing Resend module. Lets us own the confirm page (password re-entry) and reuse throttling and email code.
3. **Fully custom accounts and sessions** (own users table, hashing, cookies). Most code and security surface for no gain over Supabase. Rejected.

Also decided: **membership is revealed** (clear messages on the email card) rather than hidden; this deliberately reverses the "no enumeration" rule from the beta sign-up feature for the login page only. Mitigation: every email-card submission and sign-in attempt is IP-throttled.

## Design

### Data and security (migration)

- **Gate at the account table:** a `before insert` trigger on `auth.users` raises an exception unless a row exists in `beta_signups` with that email (case-insensitive) and `verified_at is not null`. Defense in depth behind the server check.
- **Dashboard settings (manual, documented in README):** disable "Allow new users to sign up" so the public sign-up endpoint is closed (accounts are only created via the server's secret key); keep "Confirm email" on so unconfirmed users cannot sign in.
- **`public.profiles`**: `user_id uuid primary key references auth.users on delete cascade`, `first_name`, `last_name`, `role` and `experience` (nullable; check-constrained to the allowed values), `onboarded_at timestamptz`, `created_at`. RLS on; policies allow an authenticated user to select and update only their own row; no anon access.
- **`public.watchlist_items`**: `user_id`, `ticker` (check: `^[A-Z.]{1,6}$`, uppercase), `created_at`, primary key `(user_id, ticker)`; capped (e.g. 50 per user, enforced by a trigger or check in the action). RLS owner-only.
- Profile row is created on first onboarding save, not by trigger on `auth.users`.
- Throttle rows reuse `check_signup_rate_limit` with new key prefixes (`login-email:<ip>`, `login-pw:<ip>`, `confirm-resend:<email-hash>`).

### Server behaviour

- **`checkEmail(email)`** (server action): honeypot and email validation as before; IP throttle; looks up `beta_signups` and the Supabase user (admin API). Returns `not_listed | unverified | no_account | has_account` or `rate_limited`. Sends nothing.
- **`resendBetaVerification(email)`**: for `unverified` rows only; reuses the existing verify-token issuing and cooldown logic, keyed by email; same 60 s server-enforced cooldown, client countdown is display only.
- **`createAccount(email, password, confirm)`**: re-checks `verified` membership server-side (never trusts the card state); validates the password (length 12–72, must match confirm; no composition rules; reject a short denylist of the most common passwords); creates the unconfirmed user with the secret key and generates a confirmation token; emails the link `${SITE_URL}/auth/confirm?token_hash=…` through the Resend module in `after()`. If an *unconfirmed* account for the email already exists, it is replaced (new password, new token) subject to the 60 s cooldown — nobody has proven the inbox yet. If a *confirmed* account exists, return `has_account`.
- **`/auth/confirm` (page + action):** `GET` renders only a form (token in a hidden field) — opening the link changes nothing. The submit takes the password; the server first verifies the password against the pending account (without creating a session), and only then verifies the token and confirms the account; then signs the user in and redirects to `/onboarding`. Wrong password → generic "That doesn't match the password you created", with a small attempt cap; expired/used token → "Link expired" with a path back to `/login`.
- **`signIn(email, password)`**: IP throttle; Supabase password sign-in; session cookies set via `@supabase/ssr` (new dependency; sets HttpOnly, Secure-in-production, SameSite=Lax cookies); error text is generic ("Email or password is incorrect").
- **`signOut`**: server action, clears the session, redirects to `/`.
- **Session checks:** a server-side helper (e.g. `getUser()` using `supabase.auth.getUser()`, which validates with Supabase, not just the cookie) used by `/onboarding`, `/feed` and the save actions. `proxy.ts` refreshes the session cookie and does optimistic redirects (unauthenticated → `/login`, authenticated visiting `/login` → `/feed`); it is not relied on for protection.
- **Routing after login:** `/feed` redirects to `/onboarding` if the profile has no `onboarded_at`; `/onboarding` redirects to `/feed` if it does. Onboarding progress is saved per step (so a closed tab resumes); `onboarded_at` is set on finishing step 4 (including skipped answers).
- **Onboarding saves** (`saveName`, `saveAbout`, `saveWatchlist`, `finishOnboarding`): all re-check the session; validate with zod; names are plain text with the stated limits; the watchlist is deduplicated, uppercased, format- and count-checked.
- **Landing page:** add a "Log in" link to the site header; `/login` and the new pages are `noindex`.

### Pre-registration (why the confirm page asks for the password)

Because a stranger can type a member's email on card 2a and choose the password, simply confirming the account when the member clicks the mail would hand the stranger a confirmed account. Requiring the **password to be re-entered on the confirm page** means confirmation needs both inbox access and knowledge of the password: the member can't complete it for an attacker's password, and the attacker can't read the mail. Pending, unconfirmed accounts can't sign in, expire after 48 h, and are cleaned up by the next `createAccount` for that email. *To be verified in a spike before building on it:* that Supabase distinguishes a wrong password from "email not confirmed" on an unconfirmed user (it checks the password first). If it doesn't, the builder falls back to storing a hash of the pending password in a small server-only table and comparing it before confirming.

### Configuration

Existing: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `SITE_URL`, `TRUSTED_PROXY_HOPS`. New: `SUPABASE_PUBLISHABLE_KEY` (browser-safe; used by the session client). Document the two dashboard settings and the new variable in README and `.env.example`; Cloud Run needs the new variable at deploy.

### Testing

- **Unit:** each `checkEmail` outcome; throttling; password validation; account creation refuses non-members and unverified members; replacement of unconfirmed accounts; confirm requires the correct password and a valid token; token single-use and expiry; sign-in generic errors; onboarding validation (names, enums, tickers, caps); no logging of secrets.
- **Database:** the `auth.users` trigger rejects non-beta and unverified emails and allows verified ones; RLS prevents reading or writing another user's profile or watchlist (test with two users).
- **Component:** card transitions, resend countdown from server value, password mismatch, skip/back in onboarding.
- **E2E (Playwright):** unauthenticated `/feed` → `/login`; full happy path against a test Supabase project or with the confirm token read from the test database; wrong password on the confirm page; onboarding resumes after reload; second login goes straight to `/feed`.
- **Manual (owner, needs real keys):** full flow with the Resend account's own address, since the test sender only delivers there.

## What's left to the builder

File and component structure, exact copy, visual design of the cards (match the landing page), the common-password list, the choice of how the password pre-check on the confirm page is implemented (after the spike above), and the cleanup of expired unconfirmed accounts (lazy on next attempt is enough).

## Calls I made (please check)

- **Supabase Auth with our own email** (approach 2) rather than Supabase's mailer or custom accounts.
- **The confirm page re-asks for the password.** One extra step for the user, in exchange for closing the pre-registration hole. If you'd rather accept that risk during a closed beta, we can drop it, but I recommend keeping it.
- **Membership is revealed** with plain messages; account existence is revealed too (the card branches on it). Both are IP-rate-limited.
- **Password rules:** 12–72 characters, no composition rules, common-password denylist. No password reset yet.
- **Onboarding lives at `/onboarding`**, and `/feed` redirects there until it's finished, instead of overlaying the feed.
- **Watchlist entry is typed tickers**, validated by format only, since there's no company data source yet.
- **Only steps 1–4** of the Notion flow; the post-feed feedback step belongs to the feed feature.
- **"Log in" link** added to the landing header.
- **The previous design's "no accounts" non-goal and "no enumeration" anti-goal are superseded for the login page only.**
