# equitycairn-frontend

EquityCairn web frontend: Next.js (App Router) + Tailwind CSS + shadcn/ui, on the Node runtime with pnpm.

## Requirements

- Node 26.13.1 (see `.nvmrc`)
- pnpm 12 (`packageManager` is pinned in `package.json`)

## Scripts

| Command                                              | Purpose                                         |
| ---------------------------------------------------- | ----------------------------------------------- |
| `pnpm dev`                                           | Dev server on :3000                             |
| `pnpm build` / `pnpm start`                          | Production build / server                       |
| `pnpm lint` / `pnpm typecheck` / `pnpm format:check` | Static checks                                   |
| `pnpm test`                                          | Vitest unit/component tests                     |
| `pnpm test:e2e`                                      | Playwright tests (starts dev server on :3100)   |
| `pnpm docker:build`                                  | Build the Docker image (`equitycairn-frontend`) |
| `pnpm docker:run`                                    | Run the image on http://localhost:8080          |

First-time setup: `pnpm install`, `pnpm exec playwright install chromium`, and `cp .env.example .env.local`.

Add shadcn components with `pnpm dlx shadcn@latest add <component>`.

## Configuration and beta sign-ups

The landing page's beta sign-up form is handled by server actions that write to Supabase and send a verification email through Resend. All of these are **server-only** variables (never prefix them with `NEXT_PUBLIC_`, or they would be exposed to the browser):

| Variable              | Purpose                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `SUPABASE_URL`        | Supabase project URL                                                                                                                       |
| `SUPABASE_SECRET_KEY` | Supabase secret key (bypasses RLS; keep it out of git)                                                                                     |
| `RESEND_API_KEY`      | Resend API key. Without it no email is sent (sign-up still succeeds)                                                                       |
| `EMAIL_FROM`          | Sender. Default `EquityCairn <onboarding@resend.dev>`                                                                                      |
| `SITE_URL`            | Base URL used in email links. Default `http://localhost:3000` outside production; **required in production** (no email is sent without it) |
| `TRUSTED_PROXY_HOPS`  | Trusted proxies in front of the app. Default `1` (last `x-forwarded-for` entry, correct for Cloud Run directly)                            |

Set `TRUSTED_PROXY_HOPS=2` behind a Google HTTPS load balancer. With no proxy in front of the app, `x-forwarded-for` is fully client-controlled, so the per-IP sign-up limit can be bypassed.

Locally, copy `.env.example` to `.env.local` and fill them in. In deployment (Cloud Run), set the plain values as env vars and `SUPABASE_SECRET_KEY` and `RESEND_API_KEY` as secrets (for example from Secret Manager) at deploy time. The production build does not need them, but sign-ups fail at runtime without the Supabase ones.

**Test sender limitation:** `onboarding@resend.dev` can only deliver to the address that owns the Resend account. Until a domain is verified in Resend and `EMAIL_FROM` is changed, no one else receives the verification email.

### Database

Sign-ups are stored in `public.beta_signups`, created by `supabase/migrations/20261122231834_create_beta_signups.sql`. `supabase/migrations/20261123183816_email_verification.sql` adds the token, verification and cooldown columns plus `public.signup_rate_limits` and the `check_signup_rate_limit` function. Row Level Security is enabled with no policies for `anon` or `authenticated`, so only the secret key (server side) can read or write them.

### Sign-up and verification flow

1. The form submits to `joinBeta`, which stores the address, emails a verification link and redirects to `/join-beta?token=<manage token>`.
2. `/join-beta` shows "Check your email" with a re-send button that is disabled until the cooldown ends. The cooldown is read from the server, so a reload does not reset it.
3. The emailed link opens `/join-beta/verify?token=<verify token>` and marks the address verified. Links expire after 48 hours. Reopening the link after verification shows "already verified", but an unverified expired link is reported as invalid.

Tokens are stored only as SHA-256 hashes. Sign-ups are limited to one per minute per client IP, and re-sends to one per minute per address and per client IP.

Tokens travel in URL query strings, so they appear in Cloud Run request logs (the app itself never logs them). Verification emails are sent with `after()`, i.e. after the response, so run Cloud Run with CPU always allocated (`--no-cpu-throttling`) or delivery may be delayed.

## Docker / Cloud Run

```sh
pnpm docker:build
pnpm docker:run
```

These wrap `sudo docker build -t equitycairn-frontend .` and `sudo docker run --rm -p 8080:8080 --env-file .env.local equitycairn-frontend`. `docker:run` passes your local `.env.local` into the container; on Cloud Run, set the environment variables and secrets at deploy time instead (see above). `pnpm docker:run` needs `.env.local` to exist and uses Docker `--env-file` semantics: write unquoted `KEY=value` lines, because quotes are NOT stripped.

The image uses Next's `standalone` output and listens on `$PORT` (8080 by default), as Cloud Run expects.
