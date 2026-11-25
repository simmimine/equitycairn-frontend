import { expect, type Page } from "@playwright/test";

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
