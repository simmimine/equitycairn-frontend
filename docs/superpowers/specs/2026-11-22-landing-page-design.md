# EquityCairn landing page — design

Status: awaiting approval. Date: 2026-11-22.

## Intent

EquityCairn is a ticker-first financial news product still in discovery (see the Notion "Ticker-First Financial News — Business Plan"). The landing page's job, in the owner's words: visitors should **feel welcomed to the product, have easy access to sign up for the beta, and get an overview of what it does for now.**

The Notion plan also names this page as an early experiment: a landing page with an email waitlist and a sample ticker feed, feeding a private beta.

## Goals

- A calm, precise, trustworthy first impression matching the brand direction: "financial, calm, precise".
- Email beta sign-up above the fold, with clear success and error feedback.
- A product overview: what it does (one feed, grouped duplicates, clear sources) shown with a sample feed.
- Sign-ups stored in Supabase, validated, spam-resistant, and not enumerable.
- Built from shadcn components and semantic theme tokens (the brand colours already in `globals.css`), light and dark themes.

## Non-goals

- No real news, real publisher names or logos, or live data. The sample feed is clearly labelled as a sample.
- No accounts, login, or dashboard.
- No confirmation (double opt-in) email and no email sending. Sign-ups are collected only.
- No analytics, blog, pricing page, or multi-page marketing site.
- No admin UI for the list. It is read in the Supabase dashboard.

## Anti-goals (failure even if it works)

- Claiming "all news", "real-time", or any trading/performance promise; implying publisher endorsement; investment-advice tone. (All forbidden by the Notion plan.)
- A form that reveals whether an email is already registered.
- Exposing the Supabase secret key to the browser, or leaving the table writable via the public API.

## Constraints

- Next.js 16.4.6 (App Router, React 19.3) has breaking changes: read `node_modules/next/dist/docs/` for server actions, metadata, and env handling before coding.
- shadcn `base-nova` (Base UI, `render` not `asChild`), lucide icons. Follow the shadcn rules: `FieldGroup`/`Field` for forms, `gap-*` not `space-*`, semantic colours, `Badge`/`Separator`/`Card` instead of custom markup, no sizing classes on icons in components.
- Docker deploy serves on port 8080; runtime env vars must reach the container.
- Tests exist (Vitest + Playwright); `src/app/page.test.tsx` must be updated for the new page.
- Name, domain and trademark are not yet cleared (Notion). Copy uses "EquityCairn" as the working name only.

## Approaches considered

**Layout** (mockups reviewed in the browser): A focused hero + sample feed; B dark centred editorial; C long story-driven scroll. **Chosen: A**, extended with a short "how it works" and FAQ. It puts sign-up in the first screen and shows the product, without the build and copy burden of C.

**Sign-up storage:**

1. Server action inserting with a server-only secret key into a table with no `anon` grants. **Chosen.** Closes the public API to the table, so spam controls cannot be bypassed.
2. Server action with publishable key and an `anon` insert-only RLS policy. Simpler key handling, but anyone can write to the table directly.
3. Browser inserts directly. Fewest parts, weakest spam protection.

## Design

### Page structure (single route `/`)

1. **Header:** wordmark "EquityCairn", a "Join the beta" button that scrolls to the form.
2. **Hero:** headline "The market news that matters to your watchlist." and sub-line "Know what matters across your watchlist, from one feed." Sign-up form (email `Input` + `Button`) with helper text. Beside it, a **sample feed** card: ticker `Badge`s, headline, "N sources" and a "Sample" label.
3. **How it works:** three cards: follow tickers · see one grouped feed · go to the original source.
4. **Why it's different / trust:** short points from the plan: source attribution, duplicate grouping, links to originals; no trading advice.
5. **FAQ** (`Accordion`): what is it, who is it for, what does beta cost/include, where does the news come from (honest: sources being finalised), what happens to my email.
6. **Final sign-up** repeat of the form, then **footer** with a "for information only, not investment advice" note.

Copy is drafted by the builder from the Notion plan and kept within the anti-goals. Light and dark themes both supported via existing tokens; sample feed uses semantic colours only.

### Sign-up flow

- Component: client `SignupForm` using `Field`, `Input` (`type="email"`, `autocomplete="email"`), `Button` with `Spinner` while pending, result shown with `toast` plus inline `FieldError`. A visually hidden honeypot field (`company_url_hp`) that humans never fill.
- Server action `joinBeta(formData)` in the app (server-only):
  1. If the honeypot is filled: return success silently, store nothing.
  2. **Validate email** with a shared zod schema (same schema used for client-side feedback; server is authoritative): trim, lowercase, max 254 chars, valid email format, reject empty. Invalid input returns a field error message without hitting the database.
  3. Insert into `beta_signups` via the Supabase server client using the secret key.
  4. A unique-violation (duplicate) returns the **same success result** as a new insert. Other database errors return a generic "something went wrong, please try again" and are logged server-side without the email.
- Result type: `{ ok: true } | { ok: false, error: "invalid_email" | "server_error" }`.

### Database (Supabase project `toibkwszamgrgsurwuos`, currently empty)

Table `public.beta_signups`: `id uuid pk default gen_random_uuid()`, `email text not null` with a check on length, `created_at timestamptz not null default now()`, `source text` (nullable, for later). Unique index on `lower(email)`. **RLS enabled, no policies, and no grants to `anon`/`authenticated`**; only the secret key (server) can write. Run Supabase advisors after the migration; the migration is committed under `supabase/migrations/`.

### Configuration

- Env vars, server-only (never `NEXT_PUBLIC_`): `SUPABASE_URL`, `SUPABASE_SECRET_KEY`. Add `.env.example`; real values in `.env.local` (git-ignored) and the deploy environment. Document in README; Docker run needs `--env-file`.
- Dependencies: `@supabase/supabase-js`, `zod`, plus shadcn components: `input`, `field`, `card`, `badge`, `separator`, `accordion`, `toast` (Base UI), `spinner`. Pin versions; lockfile committed.

### Testing

- Unit: the email schema (valid, invalid, trimming, casing, length) and the server action with a mocked Supabase client (success, invalid, duplicate returns success, honeypot, DB error).
- Component: form shows errors, pending state, success.
- E2E (Playwright): the page renders, submitting an invalid email shows an error, a valid email shows success (Supabase mocked at the action boundary).
- Manual check against the real Supabase project: a row is inserted once, a repeat does not duplicate, and the anon key cannot read or write the table.

## Left to the builder

Exact copy, spacing and typography details within the brand rules; sample feed content (fictional, labelled); file/component layout; rate limiting if cheap to add (not required for v1).

## Calls I made (please check)

- Added "how it works", trust section, FAQ and footer to layout A; you only approved layout A's hero + feed.
- Honeypot field for bot protection instead of a CAPTCHA.
- No double opt-in/confirmation email (would need an email provider). Consequence: typos in emails will be stored unverified.
- Duplicate emails look like success (no enumeration).
- Plain `source` column kept nullable for later use; unused in v1.
- Env var names `SUPABASE_URL` / `SUPABASE_SECRET_KEY`.
