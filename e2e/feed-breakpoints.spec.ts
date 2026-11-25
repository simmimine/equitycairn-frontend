import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoSidewaysScroll } from "./helpers";

// The boards cover 390 and 1440; these check the feed at the widths in
// between and beyond, with the default watchlist and the longest one.
const WIDTHS = [
  320, 390, 640, 767, 768, 900, 1023, 1024, 1279, 1280, 1440, 1920, 2560,
];
const WATCHLISTS = {
  "3 tickers": "AAPL,NVDA,MSFT",
  "50 tickers": Array.from({ length: 50 }, (_, i) => `T${i}`).join(","),
};

const box = async (l: Locator) => (await l.boundingBox())!;

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "sets its own widths");
});

async function open(page: Page, width: number, tickers: string, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto(`/e2e-feed?tickers=${tickers}`);
  await expect(page.locator("body[data-hydrated=true]")).toBeAttached();
  await page.evaluate(() => document.fonts.ready);
}

/** Scrolls the element into view as far as the page allows. */
async function scrollToBottom(page: Page) {
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
}

function overlaps(a: DOMRectLike, b: DOMRectLike) {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}
type DOMRectLike = { x: number; y: number; width: number; height: number };

for (const width of WIDTHS) {
  for (const [label, tickers] of Object.entries(WATCHLISTS)) {
    test(`feed layout at ${width}px with ${label}`, async ({ page }) => {
      await open(page, width, tickers);
      const phone = width < 768;
      const wide = width >= 1280;

      await expectNoSidewaysScroll(page);

      const tabs = page.getByRole("navigation", { name: "Tabs" });
      const sidebar = page.getByRole("complementary", { name: "Sidebar" });
      const panel = page.getByRole("complementary", {
        name: "Coverage at a glance",
      });
      const list = page.getByRole("list", { name: "Stories" });
      await expect(tabs).toBeVisible({ visible: phone });
      await expect(sidebar).toBeVisible({ visible: !phone });
      await expect(panel).toBeVisible({ visible: !phone });

      if (!phone) {
        const s = await box(list);
        const p = await box(panel);
        if (wide) {
          // Beside the stories, top-aligned with the page heading.
          expect(p.x).toBeGreaterThanOrEqual(s.x + s.width);
          const h1 = await box(page.getByRole("heading", { level: 1 }));
          expect(Math.abs(p.y - h1.y)).toBeLessThan(2);
        } else {
          expect(p.y).toBeGreaterThanOrEqual(s.y + s.height);
          expect(Math.abs(p.x - s.x)).toBeLessThan(1);
        }
        // The sidebar's watchlist, profile and the whole stories block are
        // inside the window or reachable by scrolling the sidebar.
        const side = await box(sidebar);
        expect(side.y + side.height).toBeLessThanOrEqual(900);
        expect(s.x).toBeGreaterThanOrEqual(side.x + side.width);
      }

      // Header controls: inside the viewport and apart from each other.
      const header = page.getByRole("banner");
      const controls = [
        header.getByRole("link", { name: "equitycairn" }),
        phone
          ? header.getByRole("button", { name: "Search" })
          : header.getByRole("searchbox"),
        ...(phone ? [] : [header.getByRole("button", { name: "Help" })]),
        header.getByRole("button", { name: "Account menu" }),
      ];
      const boxes = await Promise.all(controls.map(box));
      for (const [i, b] of boxes.entries()) {
        expect(b.x, `control ${i} left`).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width, `control ${i} right`).toBeLessThanOrEqual(width);
        for (const other of boxes.slice(i + 1)) {
          expect(overlaps(b, other), `control ${i} overlaps`).toBe(false);
        }
      }
      if (!phone) {
        // The search field is centred in the header, as on the boards.
        const search = boxes[1];
        expect(search.width).toBeLessThanOrEqual(510);
        if (width >= 1024) {
          expect(
            Math.abs(search.x + search.width / 2 - width / 2),
          ).toBeLessThan(2);
        }
      }

      // Scrolled as far as the page goes, nothing is left under the tab bar
      // (what is above the window can be scrolled back down).
      await scrollToBottom(page);
      const last = list.getByRole("article").last();
      const mismatch = page.getByRole("button", {
        name: "Report a ticker mismatch",
      });
      const bottom = phone ? (await box(tabs)).y : 900;
      for (const el of [last, mismatch]) {
        const b = await box(el);
        expect(b.y + b.height).toBeLessThanOrEqual(bottom);
      }
      // And each fits between the header and the tab bar once scrolled to.
      const top = (await box(header)).height;
      for (const el of [last, mismatch]) {
        await el.evaluate((e) => e.scrollIntoView({ block: "nearest" }));
        const b = await box(el);
        expect(b.y).toBeGreaterThanOrEqual(top);
        expect(b.y + b.height).toBeLessThanOrEqual(bottom);
      }
      await expectNoSidewaysScroll(page);
    });
  }
}

test("at 1440 the stories and panel match the desktop board", async ({
  page,
}) => {
  await open(page, 1440, WATCHLISTS["3 tickers"]);
  const stories = await box(page.getByRole("list", { name: "Stories" }));
  const panel = await box(
    page.getByRole("complementary", { name: "Coverage at a glance" }),
  );
  expect(stories.x).toBe(300);
  expect(stories.width).toBe(680);
  expect(panel.width).toBe(390);
  expect(panel.x).toBe(300 + 680 + 30);
  const header = await box(page.getByRole("banner"));
  expect(header.height).toBe(76);
  const sidebar = await box(
    page.getByRole("complementary", { name: "Sidebar" }),
  );
  expect(sidebar.width).toBe(260);
});

test("at 390 the phone header and tab bar match the phone board", async ({
  page,
}) => {
  await open(page, 390, WATCHLISTS["3 tickers"], 844);
  expect((await box(page.getByRole("banner"))).height).toBe(64);
  const tabs = await box(page.getByRole("navigation", { name: "Tabs" }));
  expect(tabs.height).toBe(66);
  expect(tabs.y + tabs.height).toBe(844);
  const story = await box(page.getByRole("article").first());
  expect(story.x).toBe(20);
  expect(story.width).toBe(350);
});

test("a short window still reaches the sidebar's watchlist and profile", async ({
  page,
}) => {
  await open(page, 1280, WATCHLISTS["50 tickers"], 600);
  const sidebar = page.getByRole("complementary", { name: "Sidebar" });
  const s = await box(sidebar);
  expect(s.y + s.height).toBeLessThanOrEqual(600);
  const watchlist = sidebar.getByRole("list", { name: "Your watchlist" });
  // The watchlist scrolls inside itself, down to its last company.
  const last = watchlist.getByRole("listitem").last();
  await last.scrollIntoViewIfNeeded();
  const l = await box(last);
  expect(l.y).toBeGreaterThanOrEqual(s.y);
  expect(l.y + l.height).toBeLessThanOrEqual(600);
  // The profile is on screen without scrolling the page.
  const profile = sidebar.getByText("Personal workspace");
  await page.evaluate(() => window.scrollTo(0, 0));
  const p = await box(profile);
  expect(p.y + p.height).toBeLessThanOrEqual(600);
  // Still true after scrolling the page.
  await scrollToBottom(page);
  const p2 = await box(profile);
  expect(p2.y + p2.height).toBeLessThanOrEqual(600);
  expect(p2.y).toBeGreaterThan(76);
});

test("a landscape phone keeps the phone layout usable", async ({ page }) => {
  await open(page, 844, WATCHLISTS["3 tickers"], 390);
  await expectNoSidewaysScroll(page);
  const header = await box(page.getByRole("banner"));
  const sidebar = page.getByRole("complementary", { name: "Sidebar" });
  // 844 wide is the tablet layout: the sidebar must still fit the short window.
  const s = await box(sidebar);
  expect(s.y + s.height).toBeLessThanOrEqual(390);
  // The sidebar scrolls within itself down to the profile.
  const profile = sidebar.getByText("Personal workspace");
  await profile.scrollIntoViewIfNeeded();
  await expect(profile).toBeInViewport();
  const p = await box(profile);
  expect(p.y + p.height).toBeLessThanOrEqual(s.y + s.height);
  // Some content is visible under the header.
  expect(header.height).toBeLessThan(390 / 3);
  await scrollToBottom(page);
  await expect(
    page.getByRole("button", { name: "Report a ticker mismatch" }),
  ).toBeInViewport();
});

test("tab bar targets are at least 44px", async ({ page }) => {
  for (const width of [320, 390]) {
    await open(page, width, WATCHLISTS["3 tickers"]);
    const tabs = page.getByRole("navigation", { name: "Tabs" });
    const targets = tabs.locator("a, button");
    await expect(targets).toHaveCount(4);
    for (const target of await targets.all()) {
      const b = await box(target);
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
    const header = page.getByRole("banner");
    for (const name of ["Search", "Account menu"]) {
      const b = await box(header.getByRole("button", { name }));
      expect(b.width, name).toBeGreaterThanOrEqual(24);
      expect(b.height, name).toBeGreaterThanOrEqual(24);
    }
  }
});

for (const width of [320, 1440]) {
  test(`a long unbroken ticker and name fit at ${width}px`, async ({
    page,
  }) => {
    const long = "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOP";
    await open(page, width, `${long},AAPL&name=${long}${long}`);
    await expectNoSidewaysScroll(page);
    const story = page.getByRole("article").first();
    await expect(story).toContainText(long);
    const card = await box(story);
    expect(card.x + card.width).toBeLessThanOrEqual(width);
    const header = page.getByRole("banner");
    const menu = await box(
      header.getByRole("button", { name: "Account menu" }),
    );
    expect(menu.x + menu.width).toBeLessThanOrEqual(width);
  });
}
