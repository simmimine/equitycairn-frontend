# equitycairn-frontend

EquityCairn web frontend: Next.js (App Router) + Tailwind CSS + shadcn/ui, on the Node runtime with pnpm.

## Requirements

- Node 26.13.1 (see `.nvmrc`)
- pnpm

## Scripts

| Command                                              | Purpose                                       |
| ---------------------------------------------------- | --------------------------------------------- |
| `pnpm dev`                                           | Dev server on :3000                           |
| `pnpm build` / `pnpm start`                          | Production build / server                     |
| `pnpm lint` / `pnpm typecheck` / `pnpm format:check` | Static checks                                 |
| `pnpm test`                                          | Vitest unit/component tests                   |
| `pnpm test:e2e`                                      | Playwright tests (starts dev server on :3100) |

Add shadcn components with `pnpm dlx shadcn@latest add <component>`.

## Docker / Cloud Run

```sh
docker build -t equitycairn-frontend .
docker run -p 8080:8080 equitycairn-frontend
```

The image uses Next's `standalone` output and listens on `$PORT` (8080 by default), as Cloud Run expects.
