import { expect, test, type Page } from "@playwright/test";

const section = (page: Page) =>
  page.getByRole("region", { name: "EquityCairn in motion" });
const video = (page: Page) => section(page).locator("video");
const paused = (page: Page) =>
  video(page).evaluate((v: HTMLVideoElement) => v.paused);

test("sits after the sample feed and before How it works", async ({ page }) => {
  await page.goto("/");
  const top = async (selector: string) =>
    (await page.locator(selector).boundingBox())!;
  const feed = await top("#product");
  const clip = (await section(page).boundingBox())!;
  const next = await top("#how-it-works");
  expect(clip.y).toBeGreaterThanOrEqual(feed.y + feed.height - 1);
  expect(next.y).toBeGreaterThanOrEqual(clip.y + clip.height - 1);
});

// Phones, tablets, laptops, desktops and tall screens.
for (const [width, height] of [
  [320, 568],
  [390, 844],
  [640, 960],
  [768, 1024],
  [820, 1180],
  [1024, 768],
  [1280, 800],
  [1440, 900],
  [1440, 1200],
  [1920, 1080],
  [2560, 1440],
]) {
  test(`is full width and below the fold at ${width}x${height}`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "sets its own sizes");
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const box = (await video(page).boundingBox())!;
    const pageWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(box.x).toBe(0);
    expect(box.width).toBe(pageWidth);
    expect(box.width / box.height).toBeCloseTo(16 / 9, 1);
    expect(box.y).toBeGreaterThanOrEqual(height);
  });
}

test("serves the WebM, an MP4 fallback and a poster", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const sources = await video(page)
    .locator("source")
    .evaluateAll((els) =>
      els.map((e) => [e.getAttribute("src"), e.getAttribute("type")]),
    );
  expect(sources).toEqual([
    ["/videos/home-watchlist.webm", "video/webm"],
    ["/videos/home-watchlist.mp4", "video/mp4"],
  ]);
  const poster = await video(page).getAttribute("poster");
  for (const url of [...sources.map(([src]) => src!), poster!]) {
    expect((await request.get(url)).status(), url).toBe(200);
  }
});

test("plays silently once scrolled to, and can be paused", async ({ page }) => {
  await page.goto("/");
  expect(await paused(page)).toBe(true);
  await video(page).scrollIntoViewIfNeeded();
  await expect.poll(() => paused(page)).toBe(false);
  expect(await video(page).evaluate((v: HTMLVideoElement) => v.muted)).toBe(
    true,
  );

  await section(page).getByRole("button", { name: "Pause video" }).click();
  await expect.poll(() => paused(page)).toBe(true);
  // Scrolling away and back respects the choice.
  await page.evaluate(() => window.scrollTo(0, 0));
  await video(page).scrollIntoViewIfNeeded();
  await expect(
    section(page).getByRole("button", { name: "Play video" }),
  ).toBeVisible();
  expect(await paused(page)).toBe(true);

  await section(page).getByRole("button", { name: "Play video" }).click();
  await expect.poll(() => paused(page)).toBe(false);
});

test("does not move on its own when reduced motion is asked for", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await video(page).scrollIntoViewIfNeeded();
  const play = section(page).getByRole("button", { name: "Play video" });
  await expect(play).toBeVisible();
  expect(await paused(page)).toBe(true);
  await play.click();
  await expect.poll(() => paused(page)).toBe(false);
});

// 2560x1440, with and without the browser's own toolbars taking some height.
for (const height of [1440, 1300]) {
  test(`the first screen fills a 2560x${height} window`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "sets its own sizes");
    await page.setViewportSize({ width: 2560, height });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const header = (await page.getByRole("banner").boundingBox())!;
    const hero = (await page.locator("#join").boundingBox())!;
    const feed = (await page.locator("#product > div").boundingBox())!;
    const clip = (await video(page).boundingBox())!;

    // The content itself fills the height, with similar space above and below.
    const above = hero.y - (header.y + header.height);
    const below = height - (feed.y + feed.height);
    expect(below).toBeGreaterThanOrEqual(0);
    expect(below).toBeLessThanOrEqual(height * 0.12);
    expect(above).toBeLessThanOrEqual(height * 0.12);
    expect(feed.width).toBeGreaterThanOrEqual(2560 * 0.75);
    // The video still starts below the fold and spans the window.
    expect(clip.y).toBeGreaterThanOrEqual(height);
    expect(clip.width).toBe(
      await page.evaluate(() => document.documentElement.clientWidth),
    );
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);
  });
}
