export type BugInput = {
  whatHappened: string;
  expected: string;
  pagePath: string;
  browser: string;
  screen: string;
};

export type BugReport = {
  whatHappened: string;
  expected: string | null;
  pagePath: string | null;
  browser: string | null;
  screen: string | null;
};

export const BUG_TEXT_MAX = 2000;

// An in-app path: no host, query or fragment.
const PAGE_PATH = /^\/(?!\/)[A-Za-z0-9/_-]{0,199}$/;
const SCREEN = /^\d{1,5}x\d{1,5}$/;

export function parsePagePath(value: unknown): string | null {
  return typeof value === "string" && PAGE_PATH.test(value) ? value : null;
}

/** Postgres refuses NUL characters in text. */
function clean(value: unknown): string {
  return typeof value === "string" ? value.replaceAll("\u0000", "").trim() : "";
}

/** Only the two typed fields can reject a report; attached details are dropped if bad. */
export function parseBugReport(
  input: unknown,
): { ok: true; report: BugReport } | { ok: false } {
  const raw = (input ?? {}) as Record<string, unknown>;
  const whatHappened = clean(raw.whatHappened);
  const expected = clean(raw.expected);
  if (
    !whatHappened ||
    whatHappened.length > BUG_TEXT_MAX ||
    expected.length > BUG_TEXT_MAX
  ) {
    return { ok: false };
  }
  const screen = clean(raw.screen);
  return {
    ok: true,
    report: {
      whatHappened,
      expected: expected || null,
      pagePath: parsePagePath(clean(raw.pagePath)),
      browser: clean(raw.browser).slice(0, 500) || null,
      screen: SCREEN.test(screen) ? screen : null,
    },
  };
}
