# Feed page UI (mocked backend)

## Intent

Replace the placeholder `/feed` with the designed watchlist news feed. The backend is the
next feature, so stories are mocked behind one function it can replace.

Source of truth: Penpot board "Feed page · Desktop + Mobile" (the four "… Final" boards:
1440 and 390 wide, light and dark). The older standalone "Feed · Light/Dark" boards are superseded.

## Goals

- Match the final boards at 390 and 1440, light and dark, and hold up at every width between and beyond.
- Ticker, time, source and search controls all narrow the mocked stories (owner's choice).
- High unit coverage and full Playwright coverage.

## Non-goals

- News ingestion, ranking, grouping, persistence, saved stories, watchlist editing, coverage
  detail, help, mismatch reporting. These controls show a "coming soon" notice (owner's choice).

## Anti-goals

- Sample content that could pass as real news. Every story is marked SAMPLE, uses placeholder
  publishers and links to example.com.

## Approaches

1. **Server `getFeed()` + filtering in the browser (picked).** Instant, simple, testable. The
   backend replaces `getFeed()`; filtering may move server-side then.
2. Filters in the URL, filtered on the server. Shareable, but a round trip per keystroke and
   decides the backend's query shape too early.
3. A mock route handler fetched by the client. Invents an API contract nobody has designed.

## Behaviour

- The watchlist is the user's real one. Name and initial come from their profile.
- Newest first. Time options: Any time, Past 24 hours, Past 7 days, Past 30 days.
- Source options come from the stories shown. Search matches headline, ticker, company, publisher.
- ⌘K / Ctrl+K focuses search. On phones the magnifier opens it; closing clears the query.
- No matches: a message with "Clear filters". No tickers: "No companies yet".
- Sign out (not on the boards) lives in the avatar menu.
- Times are shown in UTC, so server and browser render the same text.

## Layout

| Width    | Layout                                                                             |
| -------- | ---------------------------------------------------------------------------------- |
| < 768    | phone board: compact header, bottom tab bar, centred column (max 600)              |
| 768–1279 | header with search, sidebar, stories; context panel below the stories              |
| ≥ 1280   | desktop board: sidebar, stories, context panel; block centred on very wide screens |

Long watchlists (up to 50 tickers): phone ticker pills scroll sideways, wider screens wrap,
the sidebar scrolls.

Following the earlier design learning: text is never below 11px, and faint greys and dark-mode
link blue use the higher-contrast theme tokens.

## Left to the builder

Component boundaries, sample headlines, notice styling.
