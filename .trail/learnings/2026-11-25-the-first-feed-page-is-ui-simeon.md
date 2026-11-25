---
title: "The first feed page is UI on mocked stories, with working filters and coming-soon notices for unbuilt screens"
author: Simeon
date: 2026-11-25
branch: feature/feed-page
cost: { minutes: 10, tokens: 168879 }
id: l-a28457fb
scope: repo
status: active
src: agent
touches:
  - package.json
  - pnpm-lock.yaml
  - src/lib/feed/types.ts
  - vitest.config.mts
  - docs/superpowers/plans/2026-11-25-feed-page.md
  - docs/superpowers/specs/2026-11-25-feed-page-design.md
  - src/components/feed/account-menu.test.tsx
  - src/components/feed/account-menu.tsx
  - src/components/feed/app-header.test.tsx
  - src/components/feed/app-header.tsx
---

## Decided
The owner asked for the feed UI ahead of its backend. The watchlist and name are the user's real ones; stories are mocked behind one function the backend feature replaces. Ticker, time, source and search filters all work in the browser. Controls for screens that do not exist yet (saved stories, coverage, watchlist editing, help, mismatch reporting) show a "coming soon" notice.
The "... Final" boards on the combined desktop + mobile design board are the source of truth, not the older standalone feed boards.

In the code: `getFeed` in src/lib/feed/get-feed.ts, docs/superpowers/specs/2026-11-25-feed-page-design.md
With cached components on, leaving a route hides it instead of unmounting it: effect cleanups run but state survives. Short-lived UI (open menus, notices and their auto-hide timers) is cleared in a layout-effect cleanup, so it does not come back stale.

In the code: `useLayoutEffect` cleanups in src/components/feed/coming-soon.tsx and account-menu.tsx; node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md

## Tried and ruled out
Ticker filter only, or visual-only controls: the owner wanted everything testable now.
Inventing simple saved, coverage and watchlist screens: no designs to follow. Hiding those controls: the page would differ from the design.
Filtering via URL params or a mock API route: both fix the backend's shape before it is designed.

## Watch out
Filtering happens client-side only because the data is mocked; the backend feature may need to move it to the server.
A cleanup that only clears the timer leaves the notice on screen for good when the user comes back, and unit tests that only mount and unmount do not show it.
