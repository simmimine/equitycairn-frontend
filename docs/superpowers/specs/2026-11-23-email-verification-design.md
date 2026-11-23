# Beta sign-up email verification — design

Status: awaiting approval. Date: 2026-11-23. Builds on `2026-11-22-landing-page-design.md` (PR #2).

## Intent

After someone joins the beta they should get an email with a verification link that opens the site, so we know the address is real and the person has a clear "what now" page. The sign-up must resist being used to spam inboxes.

## Flow (the owner's decisions)

1. Visitor submits the form. If accepted, they are **redirected to `/join-beta?token=…`**, a "check your email" page.
2. We email them a link to **`/join-beta/verify?token=…`** (on `SITE_URL`, `http://localhost:3000` for now). Opening it marks the address verified.
3. The `/join-beta` page has a **"Re-send email"** button with a **1-minute countdown** so it cannot be spammed.
4. **Sign-ups are limited to one per minute.**
5. Emails are sent with Resend from its **test sender** (`onboarding@resend.dev`) — no domain yet. Resend only delivers the test sender's mail to the address on the Resend account, so only the owner's own address receives mail until a domain is verified.

## Goals

- Verification link works end to end locally; address is stored as verified.
- No email enumeration: a repeat sign-up (verified or not) behaves identically from the visitor's side.
- Throttling that holds across multiple server instances (state in the database, not memory).
- A failed email send never loses the sign-up.

## Non-goals

- No custom domain / DKIM setup, no HTML email design system, no unsubscribe flow, no admin UI, no marketing emails, no CAPTCHA.
- Verification does not log anyone in; there are no accounts.

## Anti-goals

- A verification link or the `/join-beta` token that lets someone verify an address they cannot read mail for.
- Any response that reveals whether an email is already on the list or verified.
- Logging email addresses or raw tokens.

## Design

### Two different tokens (important)

- **Verify token** — random 32 bytes, only ever sent by email, used at `/join-beta/verify`. Proves mailbox access.
- **Manage token** — a separate random token placed in the redirect URL `/join-beta?token=…`. It lets the page show the status and trigger a re-send, and **cannot verify** anything. If the manage token were also the verify token, anyone could verify an address they typed without reading the inbox.

Both are stored **hashed (SHA-256)**; the raw values exist only in the email / the redirect URL.

### Database (new migration; `beta_signups` keeps RLS on, no grants to anon/authenticated)

Add to `public.beta_signups`: `verify_token_hash text` (unique when set), `verify_expires_at timestamptz` (48 h after each send), `verified_at timestamptz`, `manage_token_hash text` (unique when set), `last_email_sent_at timestamptz`.
New table `public.signup_rate_limits (key text primary key, last_attempt_at timestamptz not null)`, RLS on, no grants to anon/authenticated/public, accessed only with the secret key. The "one per minute" check-and-set is a single atomic database operation (e.g. a SQL function executable only by `service_role`), not a read-then-write in app code.

### Server behaviour

- **`joinBeta` (existing action):** honeypot → validate email → **IP throttle** (key = hash of the client IP from `x-forwarded-for`, first value; 1 attempt / 60 s; over the limit returns `{ ok:false, error:"rate_limited", retryAfterSeconds }` and the form shows "Please wait a minute before trying again") → insert or find the row → create a fresh manage token and, **if the row is not verified and `last_email_sent_at` is older than 60 s (or null)**, a fresh verify token + send the email → `redirect("/join-beta?token=<manage token>")`. A verified duplicate gets no email but the same redirect. Honeypot hits keep returning the old inline `{ ok:true }`.
- **`resendVerification(token)` (new action):** looks up by manage-token hash; unknown token → generic error; verified → no-op that looks like success; unverified and cooldown elapsed → new verify token, send, update `last_email_sent_at`; cooldown not elapsed → `{ ok:false, error:"cooldown", retryAfterSeconds }`. The **server** decides the cooldown; the client countdown is only display.
- **Email sending:** a small module posting to Resend's REST API (`POST https://api.resend.com/emails`) with `fetch` — no new dependency. Subject "Confirm your EquityCairn beta sign-up", text + minimal HTML body with the link `${SITE_URL}/join-beta/verify?token=<raw>`. A send failure is logged without the email or token; the redirect and sign-up still stand, and the page's re-send button is the recovery path.
- **`/join-beta/verify` (server page):** hashes the token, finds the row, checks expiry, sets `verified_at`, keeps the verify token hash so a second click reports "already verified" (idempotent). Renders: success; "already verified" (idempotent, also shown on a second click); "invalid or expired link" with a link back to `/#join`. Verification happens on page load (a link scanner prefetching it could verify early — accepted for a waitlist).
- **`/join-beta` (server page):** resolves the manage token. Valid → "Check your email" with a **Re-send email** button (client component) that is disabled with a visible "Re-send available in 0:42" countdown, initialised from the server-computed remaining cooldown (so a refresh cannot skip it). Invalid/missing token → "This link isn't valid" with a link home. The page does not display the email address or verified status.
- Both new pages are `noindex`, use the existing brand components (`Card`, `Button`), and are usable in light and dark.

### Configuration

`RESEND_API_KEY` (server-only secret, owner pastes it into `.env.local`; never read or printed by the agent), `EMAIL_FROM` (default `EquityCairn <onboarding@resend.dev>`), `SITE_URL` (default `http://localhost:3000`; must be set on deploy). Document in README and `.env.example`; Cloud Run needs them at deploy.

### Testing

Unit: token generation/hashing; throttle (second attempt within 60 s → `rate_limited`, after → ok); redirect target; verified-duplicate and unverified-duplicate behave the same; cooldown on resend; expiry; single-use; send failure still redirects; honeypot unchanged; no email/token in logs. Component: countdown starts from server value and enables at zero; error states. E2E: invalid email still errors; `/join-beta/verify` with a bad token shows the invalid state; `/join-beta` without token shows the invalid state. Manual (owner, needs real keys): sign up with the Resend account email → receive the email → link verifies → second click says already verified → re-send respects the countdown → second sign-up within a minute is throttled.

## Approaches considered

- **Per-IP throttle in app memory:** simplest but wrong on Cloud Run's multiple instances. Rejected.
- **Per-IP throttle in the database (chosen):** consistent across instances; one small table.
- **Resend SDK vs `fetch`:** `fetch` chosen — one call, no dependency, trivially mocked.
- **Manage token = verify token:** rejected (lets a typist verify an inbox they don't own).

## Calls I made (please check)

- "Once a minute" = **per client IP** for new sign-ups, plus a **per-address 60 s cooldown** on emails. If you meant per email address or per browser instead, say so.
- Verification link works on page load (no extra confirm click); expires after 48 h and is single-use.
- A repeat sign-up for an unverified address re-sends the email (respecting the cooldown); a verified one sends nothing but looks identical.
- The `/join-beta` page does not show the email address or verified state (avoids leaking either).
- Behind a missing/forged `x-forwarded-for` locally, all requests share one `unknown` bucket — fine for dev; Cloud Run sets the header.
- Work happens on a new branch `feature/email-verification` off `feature/landing-page` as a stacked PR, since PR #2 is not merged yet.
- With the test sender, only the Resend account's own address receives mail; I'll test with that address.
