---
title: "The first feed page is UI on mocked stories, with working filters and coming-soon notices for unbuilt screens"
author: Simeon
date: 2026-11-25
branch: feature/feed-page
cost: { minutes: 56, tokens: 233549 }
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
The phone header grows to 118px while the search row is open, so the page's scroll padding grows with it (`data-search-open` on the header, `:has()` rule in globals.css). A ticker chip wraps a long unbroken ticker (`break-all`, `max-w-full`) and the story card's top row wraps, otherwise a phone layout viewport widens.

Feed filters survive a hidden route while the watchlist can change, so FeedApp treats a ticker or source the feed no longer has as none, and is keyed by user id.
Each filter select draws its own chevron right after the chosen text, as the boards do: an invisible copy of the label sets the width and the native select is stretched over it.
This replaces the earlier note about a search-open attribute and a :has() rule for the phone header: both were removed. The header and tab bar measure their own heights into CSS variables used for scroll padding, and feed text and boxes are sized in rem.

In the code: src/components/feed/use-height-variable.ts, --feed-header-height and --feed-tab-bar-height in src/app/globals.css

## Tried and ruled out
A chevron at the right edge of an `appearance-none` select: a native select is as wide as its longest option, so the icon drifts away from shorter choices.
Ticker filter only, or visual-only controls: the owner wanted everything testable now.
Inventing simple saved, coverage and watchlist screens: no designs to follow. Hiding those controls: the page would differ from the design.
Filtering via URL params or a mock API route: both fix the backend's shape before it is designed.
Checking the end of the page by scrolling to the bottom: from 1280 the mismatch link sits under the context panel at the top, so it scrolls out of view upwards, which is fine.
Fixed pixel (or fixed rem) padding values and pixel media queries: with a larger browser font the layout breakpoint moves, and the header wraps to two rows, so focus ended up hidden behind the bars.

## Watch out
Filtering happens client-side only because the data is mocked; the backend feature may need to move it to the server.
A cleanup that only clears the timer leaves the notice on screen for good when the user comes back, and unit tests that only mount and unmount do not show it.
Chromium centres an element focused by Tab, so a Tab walk never shows a scroll-padding bug. Other browsers align it to the edge. e2e/feed.spec.ts tests the padding with `scrollIntoView({ block: "start" | "end" })` instead.
Measure after `document.fonts.ready`: a late font swap moved boxes 4-6px after a test had measured them, which looked like elements hidden under the header.
`next dev` served globals.css one edit behind for a while, so a quick red/green check of a CSS change gave wrong answers. Confirm against `pnpm build` + `pnpm start` with the E2E_FAKE_* vars.
notFound() inside a Suspense boundary answers with status 200, so e2e guards must look for the not-found text.
Stubbing ResizeObserver for all tests makes Base UI call getAnimations, which jsdom lacks; stub it per test file.
The dev server can keep serving globals.css one edit behind, even after a restart.

In the code: expectTestPage in e2e/helpers.ts, src/test-utils/dom-stubs.ts
