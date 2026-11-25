import { expect, test } from "@playwright/test";

import {
  COLOR,
  calls,
  expectNoSidewaysScroll,
  hydrated,
  isMobile,
} from "./helpers";

const HEADLINE = "Know what matters across your watchlist.";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("shows the hero copy and the beta card", async ({ page }) => {
  await expect(
    page.getByRole("heading", { level: 1, name: HEADLINE }),
  ).toBeVisible();
  const card = page.locator("#join");
  await expect(card.getByText("Private beta")).toBeVisible();
  await expect(
    card.getByRole("heading", { level: 2, name: "Join the beta" }),
  ).toBeVisible();
  await expect(card.getByLabel("Email address")).toHaveAttribute(
    "placeholder",
    "you@example.com",
  );
  await expect(
    card.getByRole("button", { name: "Request beta access" }),
  ).toBeVisible();
  await expect(
    card.getByText("We’ll email you a link to confirm your address."),
  ).toBeVisible();
});

test("lays out the hero as on the board for this screen size", async ({
  page,
}) => {
  const heading = (await page
    .getByRole("heading", { level: 1 })
    .boundingBox())!;
  const card = (await page.locator("#join").boundingBox())!;
  const tiles = page.getByRole("list", { name: "What you get" });
  if (isMobile(page)) {
    expect(card.y).toBeGreaterThan(heading.y + heading.height);
    await expect(tiles).toBeHidden();
    await expect(
      page.getByText("Ticker-first · Source-linked · No investment advice"),
    ).toBeVisible();
  } else {
    expect(card.x).toBeGreaterThan(heading.x + heading.width);
    await expect(tiles.getByRole("listitem")).toHaveCount(3);
    const boxes = await Promise.all(
      (await tiles.getByRole("listitem").all()).map((t) => t.boundingBox()),
    );
    expect(new Set(boxes.map((b) => Math.round(b!.y))).size).toBe(1);
  }
  await expectNoSidewaysScroll(page);
});

test("header navigation matches the board for this screen size", async ({
  page,
}) => {
  const header = page.getByRole("banner");
  await expect(header.getByText("equitycairn")).toBeVisible();
  await expect(header.getByRole("link", { name: "Log in" })).toBeVisible();
  for (const name of ["Product", "How it works", "Join the beta"]) {
    const link = header.getByRole("link", { name });
    if (isMobile(page)) await expect(link).toBeHidden();
    else await expect(link).toBeVisible();
  }
});

test("header links jump to their sections", async ({ page }) => {
  test.skip(isMobile(page), "the mobile board has no section links");
  const header = page.getByRole("banner");
  await header.getByRole("link", { name: "Product" }).click();
  await expect(page).toHaveURL(/#product$/);
  await expect(
    page.getByRole("heading", { name: "A sample of the feed" }),
  ).toBeInViewport();
  await header.getByRole("link", { name: "How it works" }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect(
    page.getByRole("heading", { name: "How it works" }),
  ).toBeInViewport();
});

test("the header button scrolls to the form and focuses it", async ({
  page,
}) => {
  test.skip(isMobile(page), "the mobile board has no header button");
  await hydrated(page, "header a[href='#join']");
  const input = page.locator("#hero-email");
  await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
  await expect(input).not.toBeInViewport();
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Join the beta" })
    .click();
  await expect(page).toHaveURL(/#join$/);
  await expect(input).toBeInViewport();
  await expect(input).toBeFocused();
});

test("the header Log in link opens /login", async ({ page }) => {
  await page.getByRole("banner").getByRole("link", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("shows an illustrative sample feed", async ({ page }) => {
  const feed = page.locator("#product");
  await expect(feed.getByText("AAPL")).toBeVisible();
  await expect(
    feed.getByText("Example coverage: company updates its services lineup"),
  ).toBeVisible();
  const second = feed.getByText(
    "Example coverage: a new platform draws interest",
  );
  if (isMobile(page)) {
    await expect(
      feed.getByRole("heading", { name: "A glimpse of the feed" }),
    ).toBeVisible();
    await expect(second).toBeHidden();
  } else {
    await expect(second).toBeVisible();
    await expect(feed.getByText("3 related links")).toBeVisible();
  }
});

test("keeps the extra sections below the board, in order", async ({ page }) => {
  await expect(page.getByRole("main").getByRole("heading", { level: 2 }))
    // The mobile feed heading differs, so match both wordings.
    .toHaveText([
      "Join the beta",
      /A (sample|glimpse) of the feed/,
      "How it works",
      "News you can trace",
      "Questions",
      "Join the beta",
    ]);
  await expect(page.getByRole("contentinfo")).toContainText(
    "doesn’t provide investment advice",
  );
});

test("the extra sections use the hero's card style", async ({ page }) => {
  const hero = page.locator("#join");
  const style = (el: Element) => {
    const s = getComputedStyle(el);
    return [s.backgroundColor, s.borderTopColor, s.borderTopWidth];
  };
  const expected = await hero.evaluate(style);
  expect(expected).toEqual([COLOR.light.card, COLOR.light.border, "1px"]);
  for (const id of ["how-card", "trust-card", "faq-card", "cta-card"]) {
    const card = page.getByTestId(id).first();
    expect(await card.evaluate(style), id).toEqual(expected);
  }
});

test("opens and closes a FAQ answer", async ({ page }) => {
  const question = page.getByRole("button", {
    name: "What happens to my email?",
  });
  await hydrated(page, "[data-slot='accordion-trigger']");
  const answer = page.getByText("We only use your email to contact you");
  await expect(answer).toBeHidden();
  await question.click();
  await expect(answer).toBeVisible();
  await question.click();
  await expect(answer).toBeHidden();
});

for (const id of ["hero-email", "cta-email"]) {
  test(`#${id} rejects an invalid email inline`, async ({ page }) => {
    await hydrated(page, `#${id}`);
    const form = page.locator("form", { has: page.locator(`#${id}`) });
    await form.getByLabel("Email address").fill("not-an-email");
    await form.getByRole("button", { name: "Request beta access" }).click();
    await expect(form.getByText("Enter a valid email address")).toBeVisible();
    await expect(form.getByLabel("Email address")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
}

test("uses Inter", async ({ page }) => {
  await expect(page.locator("body")).toHaveCSS("font-family", /Inter/);
});

for (const scheme of ["light", "dark"] as const) {
  test(`uses the ${scheme} board colours`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.reload();
    const c = COLOR[scheme];
    await expect(page.locator("body")).toHaveCSS("background-color", c.page);
    await expect(page.getByRole("banner")).toHaveCSS(
      "background-color",
      c.card,
    );
    await expect(page.locator("#join")).toHaveCSS("background-color", c.card);
    await expect(page.locator("#join")).toHaveCSS("border-top-color", c.border);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS(
      "color",
      c.text,
    );
    await expect(page.locator("#join").getByRole("button")).toHaveCSS(
      "background-color",
      COLOR.primary,
    );
  });
}

// The real action writes to Supabase, so its outcomes run on the fake page.
test.describe("beta sign-up outcomes", () => {
  const open = async (page: import("@playwright/test").Page, q: string) => {
    await page.goto(`/e2e-auth?screen=signup&${q}`);
    await page.waitForSelector("body[data-hydrated=true]");
  };
  const submit = async (page: import("@playwright/test").Page) => {
    await page.getByLabel("Email address").fill("Ann@Example.com");
    await page.getByRole("button", { name: "Request beta access" }).click();
  };

  for (const [result, message] of [
    ["ok", "You're on the list"],
    ["rate_limited", "Please wait a minute before trying again"],
    ["server_error", "Something went wrong, please try again"],
  ]) {
    test(`shows the ${result} message`, async ({ page }) => {
      await open(page, `result=${result}`);
      await submit(page);
      await expect(page.getByText(message)).toBeVisible();
      expect(await calls(page)).toEqual([
        { action: "joinBeta", args: ["Ann@Example.com"] },
      ]);
    });
  }

  test("disables the button while sending", async ({ page }) => {
    await open(page, "result=ok&delay=1500");
    await submit(page);
    const button = page.getByRole("button", { name: "Request beta access" });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute("aria-busy", "true");
  });
});

test("feed row times and links sit on the headline's line", async ({
  page,
}) => {
  test.skip(isMobile(page), "the phone board stacks the link under the story");
  const rows = page.locator("#product li");
  await expect(rows).toHaveCount(2);
  for (const row of await rows.all()) {
    // Text baselines, measured with a zero-height inline marker in each cell.
    const baselines = await row.evaluate((li) =>
      [...li.children].map((cell) => {
        const marker = document.createElement("span");
        marker.style.cssText = "display:inline-block;height:0";
        cell.prepend(marker);
        const y = marker.getBoundingClientRect().bottom;
        marker.remove();
        return y;
      }),
    );
    expect(baselines).toHaveLength(3);
    expect(Math.max(...baselines) - Math.min(...baselines)).toBeLessThan(1);
  }
});
