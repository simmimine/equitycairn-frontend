import { expect, type Locator, type Page } from "@playwright/test";

/** Brand tokens as the browser reports them. */
export const COLOR = {
  light: {
    page: "rgb(244, 252, 253)",
    card: "rgb(255, 255, 255)",
    text: "rgb(7, 31, 34)",
    border: "rgb(184, 221, 226)",
  },
  dark: {
    page: "rgb(7, 31, 34)",
    card: "rgb(12, 44, 48)",
    text: "rgb(244, 252, 253)",
    border: "rgb(18, 58, 64)",
  },
  primary: "rgb(54, 111, 191)",
};

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

/** Waits until React has attached its handlers to the element. */
export async function hydrated(page: Page, selector: string) {
  await page.waitForFunction((s) => {
    const el = document.querySelector(s);
    return !!el && Object.keys(el).some((k) => k.startsWith("__reactProps"));
  }, selector);
}

export async function expectNoSidewaysScroll(page: Page) {
  const extra = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(extra).toBeLessThanOrEqual(0);
}

/** Every fake action call, in order (see src/app/e2e-auth/harness.tsx). */
export const calls = (page: Page) =>
  page.evaluate(() => window.__authCalls ?? []);

declare global {
  interface Window {
    __authCalls?: { action: string; args: unknown[] }[];
  }
}

/**
 * Waits for `ready` on a test-only page, or fails at once with a clear message
 * if the server is not serving it. Those pages call notFound() unless their
 * E2E_FAKE_* variable is set, and from inside Suspense that streams Next's
 * not-found page with status 200, so the status alone cannot tell.
 */
export async function expectTestPage(
  page: Page,
  ready: Locator,
  route: string,
  variable: string,
) {
  const notFound = page.getByText("This page could not be found.");
  await expect(ready.or(notFound).first()).toBeAttached();
  if (await notFound.isVisible()) {
    throw new Error(
      `${route} is 404: the server was started without ${variable}=1. ` +
        "Stop any running dev server so Playwright can start its own, or start yours with that variable.",
    );
  }
}

/**
 * Sets the browser's default font size (Chromium only), as a reader who
 * enlarged it in the settings has. Applies to pages loaded afterwards.
 */
export async function setDefaultFontSize(page: Page, px: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Page.setFontSizes", {
    fontSizes: { standard: px, fixed: Math.round((px * 13) / 16) },
  });
}
