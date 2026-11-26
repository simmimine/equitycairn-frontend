# Settings page

Status: approved by the owner on 2026-11-26. Notion: "EquityCairn — Settings Page Brainstorm".

## Intent

Give signed-in beta users one place to manage their details and account, report bugs, and see
that subscriptions (how EquityCairn will be monetised) are coming. Reached from the avatar at
the top right and the profile at the bottom left of the feed.

## Goals

- Change first and last name, role and experience.
- Choose light, dark or system.
- Change password and delete account, each proven by a link sent to the sign-up email.
- Report a bug: saved in Supabase, and the owner is emailed.
- A subscription placeholder.
- Search the settings, with a keyboard shortcut (added by the owner after approval).

## Non-goals

- Watchlist editing (its own management page). The feed's "Manage" stays "coming soon".
- Changing the email address, forgotten password, an issue tracker.
- Plans, prices, checkout.
- Data export, two-factor, session list, alerts, source or feed preferences, teams.

## Anti-goals

- A password change or deletion that happens because a link was merely opened.
- A bug report lost because an email failed.
- A subscription section that looks purchasable.

## Constraints

- Next.js 16: read `node_modules/next/dist/docs/` before Next-specific code. pnpm.
- shadcn components and existing theme tokens. Design: Penpot section "Settings page · Desktop +
  Mobile" (four page boards, four search boards; 1440 and 390, light and dark).
- Text never below 11px; phone to wide desktop, light and dark, keyboard operable.
- Every server action re-checks the session; the proxy is not a security boundary.
- Never log email addresses, tokens or report text.

## Approaches

**Emailed links**

1. **Our own one-time links (picked by the owner).** One table and one mechanism for both
   actions; opening a link signs nobody in. More code and security testing.
2. Supabase's recovery link for passwords, our own for deletion. Less password code, but two
   systems, and using the recovery link signs in whoever has it.

**Page structure** (builder's-side call)

1. **One `/settings` page with all sections (picked).** Little content per section.
2. A route per section. More files and navigation for six small panels.

## Page

- `/settings`, signed-in and onboarded users only (otherwise `/login` or `/onboarding`). Add it
  to the proxy matcher.
- Sections in order: Profile, Appearance, Account and security, Subscription, Report a bug,
  Privacy and help.
- From `md`: section links on the left, panels on the right. Phones: stacked.
- Header: wordmark linking to the feed, settings search, and the account menu. No story search.
- Phones keep the bottom tab bar with Profile marked current.

### Settings search

- Same place and shortcut as the feed search: Ctrl+K or ⌘K focuses it, on any keyboard layout.
  Phones: a magnifier opens a search row under the header.
- Matches setting names and section names, ignoring case. Each result shows the setting and its
  section. No match: "No settings match".
- Up and Down move, Enter or a tap goes to the setting and focuses its control (it never
  presses it), Escape closes and clears.

### Entry points

- Top-right avatar menu: add "Settings" above "Sign out".
- Bottom-left sidebar profile: the whole row links to `/settings`.
- Phone "Profile" tab: links to `/settings` instead of "coming soon".

### Sections

- **Profile:** first and last name, validated by `parseName`; role and experience, validated by
  `parseAbout`, including "Prefer not to say". One Save button, with confirmation and errors.
  New actions: the onboarding ones refuse onboarded users. The new name shows on the feed
  straight away.
- **Appearance:** Light, Dark, System through `next-themes`. Applies immediately, per device.
- **Account and security:** email (read only), Change password, Sign out, Sign out of all
  devices, Delete account.
  - Today's sign out uses Supabase's default, which ends **every** session. "Sign out" (here
    and in the avatar menu) becomes this-device-only; "all devices" keeps the global one.
- **Subscription:** "Subscriptions are coming soon." No controls.
- **Report a bug:** see below.
- **Privacy and help:** what we store (name, email, role, experience, watchlist, bug reports),
  that EquityCairn gives no investment advice, and a support address from `SUPPORT_EMAIL`
  (the line is hidden when unset).

## Emailed links

1. The user presses "Change password" or "Delete account". The server emails the session's own
   address and the page says where it was sent. If sending fails, say so.
2. The link opens `/account/confirm?token=…`. It works signed out or on another device.
   Opening it changes nothing and does not use up the link.
3. Password: enter the new password twice (`validatePassword`), press the button. Deletion: a
   warning that it is permanent, then a "Delete my account" button.
4. Success: the password changes (admin API) and every session ends, or the account is deleted.
   The browser's session cookies are cleared. Offer sign-in, or the home page.
5. Used, expired, replaced or unknown links show one message: request a new one from Settings.

Rules:

- Table `account_action_tokens`: token hash, user, purpose (`password_change`,
  `account_delete`), expiry. Only the service role can read or write it. Rows go when the
  account goes.
- Random token, stored only as a hash. Lasts 30 minutes, works once. One live link per user per
  purpose: a new request replaces the old.
- The purpose comes from the stored row, never from the URL.
- Consume atomically, after validating the input, so two clicks cannot both run. If the action
  then fails, the user requests a new link.
- Rate limits through `bump_attempts`: 3 link requests per 10 minutes per account; 10
  confirmations per 10 minutes per client.
- Links are built from `SITE_URL`. The page is `noindex` and sends no referrer.
- Check that the admin password update really ends other sessions. If it does not, end them
  explicitly.

### What this does and does not protect

The link rule governs EquityCairn's own screens. Supabase's account API also lets whoever holds
a signed-in session change the password or email directly. To guard against that:

- **Turn on "Require current password when changing"** in the Supabase dashboard (owner's step,
  before release). A direct password change then needs the current password. Confirm on the
  real project that a direct change without it is refused, and that the emailed-link flow
  (admin API) still works.
- **Hide the session cookie from page scripts:** set `httpOnly` wherever the Supabase server
  client writes cookies (`src/lib/auth/session.ts` and `src/proxy.ts`). Supabase's default is
  readable by scripts. Nothing in `src` creates a browser-side Supabase client; keep it that
  way. Check that sign-in, refresh and sign-out still work.
- A database trigger refuses changes to `auth.users.email` (this also stops an email change
  getting round the beta list).

What is left, accepted for the beta: a stolen session can still read and edit the profile and
watchlist until it ends (an issued access token works until it expires), and none of this stops
someone who also knows the password or controls the inbox.

## Bug reports

- Fields: "What happened?" (required) and "What did you expect?" (optional), 2000 characters
  each.
- Attached, and said so on the form: the page they came to Settings from (an in-app path only),
  browser and screen size.
- Table `bug_reports`: id, user, the fields above, status (`new`, `looking`, `fixed`; default
  `new`), created time. Written only by the server; no browser access. Status is edited in the
  Supabase dashboard.
- Save first, then email `BUG_REPORT_EMAIL` with `sendEmail`, escaping the text. An email
  failure is logged and the user still sees success.
- 5 reports per hour per account. The typed text survives a failed submit.
- Without a verified Resend domain, mail only reaches the Resend account's own address.

## Account deletion

Removes the auth account; profile and watchlist cascade. It also deletes the person's beta
sign-up record and bug reports (owner's decision), so they must join the beta list again to
return. Emails already sent to the owner about their reports are not recalled.

## Configuration

New in `.env.example`: `BUG_REPORT_EMAIL`, `SUPPORT_EMAIL`. Migrations are applied to the live
project only with the owner's go-ahead.

## Testing

Vitest for validation, actions and components (including expired, reused, replaced and
wrong-purpose links, rate limits and email failure). Playwright for the settings page and the
confirm page at phone and desktop widths, using fake actions like the existing e2e harnesses.
A manual pass against the real project: both emails, and sessions ending.

## Left to the builder

Component boundaries, copy, notice styling, and how the e2e harness is built.
