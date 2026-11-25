import { expect, test, type Page } from "@playwright/test";

import { COLOR, calls, expectNoSidewaysScroll, isMobile } from "./helpers";

// Drives the real FeedApp on mocked stories with a fake sign out (see
// src/app/e2e-feed). Runs in the desktop and mobile projects.

const DEFAULT = ["AAPL", "NVDA", "MSFT"];
const FIFTY = Array.from({ length: 50 }, (_, i) => `T${i}`);
/** Each default ticker has one story from the past hour and one older one. */
const ALL_STORIES = 6;

/** Console errors and React warnings, so a test can assert there were none. */
function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error}`));
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" || /hydrat/i.test(text)) {
      problems.push(`${message.type()}: ${text}`);
    }
  });
  return problems;
}

async function open(page: Page, query = "") {
  const response = await page.goto(`/e2e-feed${query}`);
  if (response?.status() === 404) {
    throw new Error(
      "/e2e-feed is 404: the server was started without E2E_FAKE_FEED=1. " +
        "Stop any running dev server so Playwright can start its own, or start yours with that variable.",
    );
  }
  await expect(page.locator("body[data-hydrated=true]")).toBeAttached();
  // A late font swap would move things after a test has measured them.
  await page.evaluate(() => document.fonts.ready);
}

const stories = (page: Page) =>
  page.getByRole("list", { name: "Stories" }).getByRole("article");

const searchBox = (page: Page) =>
  page.getByRole("searchbox", {
    name: "Search companies, tickers, or stories",
  });

async function search(page: Page, text: string) {
  await (
    isMobile(page)
      ? page.getByRole("button", { name: "Search" })
      : searchBox(page)
  ).click();
  await expect(searchBox(page)).toBeFocused();
  await searchBox(page).fill(text);
}

const notice = (page: Page) =>
  page.getByRole("status").filter({ hasText: "is coming soon." });

test.describe("feed page", () => {
  let problems: string[];

  test.beforeEach(async ({ page }) => {
    problems = watchConsole(page);
    await open(page);
  });

  test.afterEach(() => {
    expect(problems).toEqual([]);
  });

  test("shows the boards' content", async ({ page }) => {
    await expect(
      page.getByRole("heading", { level: 1, name: "News for your watchlist" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        isMobile(page)
          ? "Coverage around your followed companies."
          : "Company coverage, grouped and ordered by publication time.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "equitycairn" }),
    ).toHaveAttribute("href", "/feed");

    const pills = page.getByRole("group", { name: "Filter by company" });
    await expect(pills.getByRole("button")).toHaveText(["All", ...DEFAULT]);
    await expect(pills.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await expect(stories(page)).toHaveCount(ALL_STORIES);
    const [first, second, third] = await stories(page).all();
    await expect(first).toContainText("AAPL");
    await expect(first).toContainText(
      "Example coverage: company updates its services lineup",
    );
    await expect(first).toContainText("Example Publisher");
    await expect(first).toContainText("25 Nov · 11:42 UTC");
    await expect(first).toContainText("3 sample links grouped");
    await expect(first).toContainText("NEW");
    await expect(second).toContainText(
      "Example coverage: new platform draws data-center interest",
    );
    await expect(second).toContainText("1 sample link");
    await expect(third).toContainText(
      "Example filing: quarterly report adds context to company updates",
    );
    await expect(third).toContainText("Filed document · original link");
    await expect(third).not.toContainText("NEW");
    await expect(page.getByText("6 stories shown")).toBeAttached();

    const mobile = isMobile(page);
    await expect(page.getByRole("navigation", { name: "Tabs" })).toBeVisible({
      visible: mobile,
    });
    await expect(
      page.getByRole("complementary", { name: "Sidebar" }),
    ).toBeVisible({ visible: !mobile });
    const panel = page.getByRole("complementary", {
      name: "Coverage at a glance",
    });
    await expect(panel).toBeVisible({ visible: !mobile });
    if (!mobile) {
      await expect(page.getByText("Newest first")).toBeVisible();
      await expect(page.getByText("Example items")).toBeVisible();
      await expect(
        page.getByText(
          "Example content only · sources shown here are placeholders.",
        ),
      ).toBeVisible();
      await expect(panel).toContainText("Apple Inc.");
      await expect(panel).toContainText("NVIDIA");
      await expect(panel).toContainText("Microsoft");
      const watchlist = page.getByRole("list", { name: "Your watchlist" });
      await expect(watchlist.getByRole("listitem")).toHaveCount(3);
      await expect(
        page.getByRole("complementary", { name: "Sidebar" }),
      ).toContainText("Simeon");
    }
    await expectNoSidewaysScroll(page);
  });

  test("the ticker pills filter the stories", async ({ page }) => {
    const pills = page.getByRole("group", { name: "Filter by company" });
    await pills.getByRole("button", { name: "NVDA" }).click();
    await expect(pills.getByRole("button", { name: "NVDA" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(stories(page)).toHaveCount(2);
    for (const story of await stories(page).all()) {
      await expect(story).toContainText("NVDA");
    }
    await expect(page.getByText("2 stories shown")).toBeAttached();
    await pills.getByRole("button", { name: "All" }).click();
    await expect(stories(page)).toHaveCount(ALL_STORIES);
  });

  test("the time range filters the stories", async ({ page }) => {
    const time = page.getByRole("combobox", { name: "Time range" });
    for (const [value, count] of [
      ["24h", 3],
      ["7d", 4],
      ["30d", 5],
      ["any", ALL_STORIES],
    ] as const) {
      await time.selectOption(value);
      await expect(stories(page)).toHaveCount(count);
    }
  });

  test("the source filters the stories", async ({ page }) => {
    const source = page.getByRole("combobox", { name: "Source" });
    await expect(source.getByRole("option")).toHaveText([
      "Any source",
      "Company filing",
      "Example Publisher",
      "Example Wire",
    ]);
    await source.selectOption("Company filing");
    await expect(stories(page)).toHaveCount(2);
    for (const story of await stories(page).all()) {
      await expect(story).toContainText("Company filing");
    }
    await source.selectOption("");
    await expect(stories(page)).toHaveCount(ALL_STORIES);
  });

  test("search filters the stories", async ({ page }) => {
    await search(page, "data-center");
    await expect(stories(page)).toHaveCount(1);
    await expect(stories(page)).toContainText("NVDA");
    // Company names match too.
    await searchBox(page).fill("microsoft");
    await expect(stories(page)).toHaveCount(2);

    await searchBox(page).press("Escape");
    // Hidden on phones by then, so not found by role.
    await expect(page.locator("input[type=search]")).toHaveValue("");
    await expect(stories(page)).toHaveCount(ALL_STORIES);
    if (isMobile(page)) {
      await expect(searchBox(page)).toBeHidden();
      await expect(page.getByRole("button", { name: "Search" })).toBeFocused();
    }
  });

  test("Ctrl+K opens and focuses search", async ({ page }) => {
    if (isMobile(page)) await expect(searchBox(page)).toBeHidden();
    await page.locator("body").click({ position: { x: 1, y: 300 } });
    await page.keyboard.press("Control+k");
    await expect(searchBox(page)).toBeVisible();
    await expect(searchBox(page)).toBeFocused();
    await page.keyboard.type("apple");
    await expect(stories(page)).toHaveCount(2);
  });

  test("a combination that matches nothing, then Clear filters", async ({
    page,
  }) => {
    await page
      .getByRole("group", { name: "Filter by company" })
      .getByRole("button", { name: "AAPL" })
      .click();
    await page
      .getByRole("combobox", { name: "Time range" })
      .selectOption("24h");
    await search(page, "filing");
    await expect(
      page.getByRole("heading", { name: "No stories match these filters" }),
    ).toBeVisible();
    await expect(page.getByRole("list", { name: "Stories" })).toHaveCount(0);
    await expect(page.getByText("0 stories shown")).toBeAttached();

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(stories(page)).toHaveCount(ALL_STORIES);
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await expect(searchBox(page)).toHaveValue("");
    await expect(
      page.getByRole("combobox", { name: "Time range" }),
    ).toHaveValue("any");
    await expect(
      page
        .getByRole("group", { name: "Filter by company" })
        .getByRole("button", { name: "All" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("every unbuilt control says it is coming soon", async ({ page }) => {
    const sidebar = page.getByRole("complementary", { name: "Sidebar" });
    const panel = page.getByRole("complementary", {
      name: "Coverage at a glance",
    });
    const tabs = page.getByRole("navigation", { name: "Tabs" });
    const controls = isMobile(page)
      ? [
          [tabs.getByRole("button", { name: "Watchlist" }), "Watchlist"],
          [tabs.getByRole("button", { name: "Saved" }), "Saved stories"],
          [tabs.getByRole("button", { name: "Profile" }), "Profile"],
          [
            page.getByRole("button", { name: "Report a ticker mismatch" }),
            "Mismatch reporting",
          ],
        ]
      : [
          [page.getByRole("button", { name: "Help" }), "Help"],
          [
            sidebar.getByRole("button", { name: "Saved stories" }),
            "Saved stories",
          ],
          [
            sidebar.getByRole("button", { name: "Manage watchlist" }),
            "Watchlist management",
          ],
          [
            stories(page)
              .first()
              .getByRole("button", { name: "View coverage" }),
            "Coverage view",
          ],
          [
            panel.getByRole("button", { name: "Manage watchlist" }),
            "Watchlist management",
          ],
          [
            page.getByRole("button", { name: "Report a ticker mismatch" }),
            "Mismatch reporting",
          ],
        ];

    for (const [control, feature] of controls as [
      ReturnType<Page["locator"]>,
      string,
    ][]) {
      await control.click();
      await expect(notice(page)).toContainText(`${feature} is coming soon.`);
      await notice(page).getByRole("button", { name: "Dismiss" }).click();
      await expect(notice(page)).toHaveCount(0);
    }
  });

  test("the notice sits clear of the tab bar", async ({ page }) => {
    test.skip(!isMobile(page), "the tab bar is phone only");
    const tabs = page.getByRole("navigation", { name: "Tabs" });
    await tabs.getByRole("button", { name: "Profile" }).click();
    const box = (await notice(page).locator("> div").boundingBox())!;
    const bar = (await tabs.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(bar.y);
  });

  test("the original link opens the source in a new tab", async ({ page }) => {
    const link = stories(page)
      .first()
      .getByRole("link", { name: /Original story/ });
    await expect(link).toHaveAttribute(
      "href",
      "https://example.com/AAPL/latest",
    );
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(link).toContainText("(opens in a new tab)");
  });

  test("the account menu signs out", async ({ page }) => {
    await page.getByRole("button", { name: "Account menu" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Simeon");
    await dialog.getByRole("button", { name: "Sign out" }).click();
    await expect
      .poll(() => calls(page))
      .toEqual([{ action: "signOut", args: [] }]);
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`uses the ${scheme} board colours`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.reload();
      await expect(page.locator("body[data-hydrated=true]")).toBeAttached();
      const c = COLOR[scheme];
      await expect(page.locator("body")).toHaveCSS("background-color", c.page);
      await expect(page.getByRole("banner")).toHaveCSS(
        "background-color",
        c.card,
      );
      const card = stories(page).first();
      await expect(card).toHaveCSS("background-color", c.card);
      await expect(card).toHaveCSS("border-top-color", c.border);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCSS(
        "color",
        c.text,
      );
      await expect(
        page
          .getByRole("group", { name: "Filter by company" })
          .getByRole("button", { name: "All" }),
      ).toHaveCSS("background-color", COLOR.primary);
      const chrome = isMobile(page)
        ? page.getByRole("navigation", { name: "Tabs" })
        : page.getByRole("complementary", { name: "Coverage at a glance" });
      await expect(chrome).toHaveCSS("background-color", c.card);
      if (!isMobile(page)) {
        await expect(
          page.getByRole("complementary", { name: "Sidebar" }),
        ).toHaveCSS("background-color", c.card);
      }
    });
  }
});

test.describe("unusual watchlists", () => {
  let problems: string[];

  test.beforeEach(async ({ page }) => {
    problems = watchConsole(page);
  });

  test.afterEach(() => {
    expect(problems).toEqual([]);
  });

  test("an empty watchlist says so and offers no filters", async ({ page }) => {
    await open(page, "?tickers=");
    await expect(
      page.getByRole("heading", { name: "No companies yet" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Add companies to follow and their news will appear here. Adding companies is coming soon.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Filter by company" }),
    ).toHaveCount(0);
    await expect(page.getByRole("list", { name: "Stories" })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Report a ticker mismatch" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("complementary", { name: "Coverage at a glance" }),
    ).toHaveCount(0);
    await expectNoSidewaysScroll(page);
  });

  test("no first name still reads sensibly", async ({ page }) => {
    await open(page, "?name=");
    await page.getByRole("button", { name: "Account menu" }).click();
    await expect(page.getByRole("dialog")).toContainText("Your account");
    if (!isMobile(page)) {
      await expect(
        page.getByRole("complementary", { name: "Sidebar" }),
      ).toContainText("Your account");
    }
  });

  test("unknown tickers show the ticker, never undefined", async ({ page }) => {
    await open(page, "?tickers=ZZZZ,BRK.B");
    await expect(stories(page)).toHaveCount(4);
    await expect(page.locator("body")).not.toContainText("undefined");
    await expect(page.locator("body")).not.toContainText("null");
    await expect(stories(page).first()).toContainText("ZZZZ");
  });

  test("50 tickers stay usable", async ({ page }) => {
    await open(page, `?tickers=${FIFTY.join(",")}`);
    const pills = page.getByRole("group", { name: "Filter by company" });
    await expect(pills.getByRole("button")).toHaveCount(51);
    // The last pill can be reached and used, even in the sideways row.
    await pills.getByRole("button", { name: "T49" }).click();
    await expect(stories(page)).toHaveCount(2);
    await expectNoSidewaysScroll(page);
  });

  test("a long unbroken ticker and name do not widen the page", async ({
    page,
  }) => {
    const long = "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOP";
    await open(page, `?tickers=${long},AAPL&name=${long}${long}`);
    await expect(stories(page).first()).toContainText(long);
    await expectNoSidewaysScroll(page);
    for (const story of await stories(page).all()) {
      const box = (await story.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    }
    await page.getByRole("button", { name: "Account menu" }).click();
    const dialog = (await page.getByRole("dialog").boundingBox())!;
    expect(dialog.x).toBeGreaterThanOrEqual(0);
    expect(dialog.x + dialog.width).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
    await expectNoSidewaysScroll(page);
  });
});

test.describe("keyboard", () => {
  test("Tab reaches every control in order", async ({ page }) => {
    await open(page);
    const mobile = isMobile(page);
    const expected = mobile
      ? [
          "equitycairn",
          "Search",
          "Account menu",
          "All",
          ...DEFAULT,
          "Time range",
          "Source",
          ...Array(ALL_STORIES).fill("Original story"),
          "Report a ticker mismatch",
          "Feed",
          "Watchlist",
          "Saved",
          "Profile",
        ]
      : [
          "equitycairn",
          "Search companies, tickers, or stories",
          "Help",
          "Account menu",
          "News feed",
          "Saved stories",
          "Manage watchlist",
          "Your watchlist",
          "All",
          ...DEFAULT,
          "Time range",
          "Source",
          ...Array(ALL_STORIES)
            .fill(["Original story", "View coverage"])
            .flat(),
          "Manage watchlist",
          "Report a ticker mismatch",
        ];

    const reached: string[] = [];
    await page.locator("body").focus();
    for (let i = 0; i < expected.length; i++) {
      await page.keyboard.press("Tab");
      reached.push(
        await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          const label =
            el.getAttribute("aria-label") ??
            el.textContent?.replace(/[↗→]|\(opens in a new tab\)/g, "") ??
            "";
          return label.trim();
        }),
      );
    }
    expect(reached).toEqual(expected);
  });

  test("a focused element is never hidden under the header or tab bar", async ({
    page,
  }) => {
    await open(page);
    if (isMobile(page)) {
      // The open search row makes the phone header taller.
      await page.getByRole("button", { name: "Search" }).click();
      await expect(searchBox(page)).toBeFocused();
    }
    const header = page.getByRole("banner");
    const tabs = page.getByRole("navigation", { name: "Tabs" });
    const mobile = isMobile(page);
    const visibleArea = async () => {
      const top = (await header.boundingBox())!;
      const bottom = mobile
        ? (await tabs.boundingBox())!.y
        : page.viewportSize()!.height;
      return { top: top.y + top.height, bottom };
    };
    /** Walks focus with `key` until it reaches `last`, checking each stop. */
    const walk = async (key: string, last: RegExp) => {
      for (let step = 0; step < 60; step++) {
        await page.keyboard.press(key);
        const focused = page.locator(":focus");
        const inChrome = await focused.evaluate(
          (el) => !!el.closest("header, nav[aria-label='Tabs']"),
        );
        const name = await focused.evaluate(
          (el) => el.getAttribute("aria-label") ?? el.textContent ?? "",
        );
        if (!inChrome) {
          const box = (await focused.boundingBox())!;
          const area = await visibleArea();
          expect(box.y, `${name} under the header`).toBeGreaterThanOrEqual(
            area.top,
          );
          expect(
            box.y + box.height,
            `${name} under the bottom edge`,
          ).toBeLessThanOrEqual(area.bottom);
        }
        if (last.test(name)) return;
      }
      throw new Error(`never reached ${last}`);
    };
    // Down to the end of the page, then back up to the header.
    await walk("Tab", mobile ? /^Feed$/ : /Report a ticker mismatch/);
    await walk("Shift+Tab", mobile ? /^Search$/ : /^Account menu$/);
  });
});

test("scrolling to focus clears the header, search row and tab bar", async ({
  page,
}) => {
  // Browsers that align a focused element to the edge (rather than centring
  // it, as Chromium does on Tab) rely on the page's scroll padding.
  await open(page);
  const mobile = isMobile(page);
  for (const searchOpen of mobile ? [false, true] : [false]) {
    if (searchOpen) await page.getByRole("button", { name: "Search" }).click();
    const header = (await page.getByRole("banner").boundingBox())!;
    const bottom = mobile
      ? (await page.getByRole("navigation", { name: "Tabs" }).boundingBox())!.y
      : page.viewportSize()!.height;
    const links = page.getByRole("link", { name: /Original story/ });
    for (const [i, block] of [
      [2, "start"],
      [3, "end"],
    ] as const) {
      await links
        .nth(i)
        .evaluate((el, b) => el.scrollIntoView({ block: b }), block);
      const box = (await links.nth(i).boundingBox())!;
      // Within a pixel: the padding is whole pixels, boxes are not.
      expect(box.y, `${block}, search ${searchOpen}`).toBeGreaterThanOrEqual(
        header.y + header.height - 1,
      );
      expect(box.y + box.height, `${block}`).toBeLessThanOrEqual(bottom + 1);
    }
  }
});

test("/feed redirects signed-out visitors to /login", async ({ page }) => {
  await page.goto("/feed");
  await expect(page).toHaveURL(/\/login$/);
});
