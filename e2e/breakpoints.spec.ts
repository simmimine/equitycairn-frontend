import { expect, test, type Locator } from "@playwright/test";

import { expectNoSidewaysScroll } from "./helpers";

// The boards cover 390 and 1440; these check the widths in between and beyond.
const PHONE = [320, 390, 640, 767];
const WIDE = [768, 900, 1023, 1024, 1180, 1280, 1440, 1920];

const box = async (l: Locator) => (await l.boundingBox())!;
const lines = (l: Locator) =>
  l.evaluate((el) =>
    Math.round(el.clientHeight / parseFloat(getComputedStyle(el).lineHeight)),
  );

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "sets its own widths");
});

for (const width of PHONE) {
  test(`home keeps the phone column at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const card = await box(page.locator("#join"));
    const h1 = await box(page.getByRole("heading", { level: 1 }));
    expect(card.y).toBeGreaterThan(h1.y + h1.height);
    // Never stretched edge to edge, and centred when there is room.
    expect(card.width).toBeLessThanOrEqual(560);
    expect(Math.abs(card.x - (width - card.x - card.width))).toBeLessThan(2);
    for (const id of ["#product", "#how-it-works"]) {
      const heading = await box(page.locator(`${id} h2`));
      expect(Math.abs(heading.x - card.x), id).toBeLessThan(2);
    }
    await expectNoSidewaysScroll(page);
  });
}

for (const width of WIDE) {
  test(`home keeps the desktop layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const h1 = page.getByRole("heading", { level: 1 });
    const heading = await box(h1);
    const card = await box(page.locator("#join"));
    // Copy and sign-up sit side by side, as on the desktop board.
    expect(card.x).toBeGreaterThan(heading.x + heading.width);
    expect(card.y).toBeLessThan(heading.y + heading.height);
    expect(await lines(h1)).toBeLessThanOrEqual(3);

    const tiles = page.getByRole("list", { name: "What you get" });
    for (const tile of await tiles.getByRole("listitem").all()) {
      const [title, text] = await tile.locator("p").all();
      expect(await lines(title)).toBe(1);
      expect((await box(text)).height).toBeLessThan(40);
    }
    await expectNoSidewaysScroll(page);
  });
}

for (const width of [...PHONE, ...WIDE]) {
  test(`login fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    const card = await box(page.getByTestId("auth-card"));
    expect(card.x).toBeGreaterThanOrEqual(16);
    expect(card.x + card.width).toBeLessThanOrEqual(width - 16);
    await expect(
      page.getByRole("complementary", { name: "About EquityCairn" }),
    ).toBeVisible({ visible: width >= 1024 });
    await expectNoSidewaysScroll(page);
  });
}
