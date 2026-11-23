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

The landing page's beta sign-up form is handled by a server action (`joinBeta`) that writes to Supabase. It needs two **server-only** variables (never prefix them with `NEXT_PUBLIC_`, or they would be exposed to the browser):

| Variable              | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| `SUPABASE_URL`        | Supabase project URL                                   |
| `SUPABASE_SECRET_KEY` | Supabase secret key (bypasses RLS; keep it out of git) |

Locally, copy `.env.example` to `.env.local` and fill them in. In deployment (Cloud Run), set `SUPABASE_URL` as an env var and `SUPABASE_SECRET_KEY` as a secret (for example from Secret Manager) at deploy time. The production build does not need them, but sign-ups fail at runtime without them.

Sign-ups are stored in the `public.beta_signups` table, created by the migration `supabase/migrations/20261122231834_create_beta_signups.sql`. Row Level Security is enabled with no policies for `anon` or `authenticated`, so only the secret key (server side) can read or write it.

## Docker / Cloud Run

```sh
pnpm docker:build
pnpm docker:run
```

These wrap `sudo docker build -t equitycairn-frontend .` and `sudo docker run --rm -p 8080:8080 --env-file .env.local equitycairn-frontend`. `docker:run` passes your local `.env.local` into the container; on Cloud Run, set the environment variables and secrets at deploy time instead (see above). `pnpm docker:run` needs `.env.local` to exist and uses Docker `--env-file` semantics: write unquoted `KEY=value` lines, because quotes are NOT stripped.

The image uses Next's `standalone` output and listens on `$PORT` (8080 by default), as Cloud Run expects.
