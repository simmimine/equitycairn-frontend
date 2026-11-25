# Home, beta sign-up and login: match the Penpot designs

Date: 2026-11-25. Direction approved in conversation (no separate doc review).

## Intent

Make the home page and every sign-up / login screen look like the Penpot boards
(desktop and mobile, light and dark). Behaviour of sign-up and login is unchanged.

## Approaches

1. Match the board exactly and drop the sections it lacks.
2. **Chosen:** board first, then the existing How it works, Trust, FAQ and final
   sign-up below it, restyled in the hero's visual language.

## Calls

- Inter replaces Geist across the app.
- The beta "check your email" screen does not show the address: its URL token must
  not reveal one.
- Screens without a board (errors, not listed, invalid link) use the same card.
- Small design text is floored at 11px; the board's lighter grey and dark-mode
  link blue are swapped for higher-contrast tokens (WCAG AA).
- Dark-mode form controls keep a lighter outline than the board's #123a40.
- The sample feed follows the board: AAPL with "Example coverage" headlines, which
  replaces the earlier plan's fictional tickers.
- Header "Product" jumps to the sample feed, "How it works" to that section.
- Signed-in and token states are tested through `/e2e-auth`, a page with fake
  actions that 404s unless `E2E_FAKE_AUTH=1`.
