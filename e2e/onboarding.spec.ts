import { expect, test, type Page } from "@playwright/test";

// Drives the real OnboardingFlow against in-memory fake actions (see
// src/app/e2e-onboarding). Runs in the desktop and mobile projects.

type Call = { action: string; args: unknown[] };

async function open(page: Page, query = "") {
  const response = await page.goto(`/e2e-onboarding${query}`);
  if (response?.status() === 404) {
    throw new Error(
      "/e2e-onboarding is 404: the server was started without E2E_FAKE_ONBOARDING=1. " +
        "Stop any running dev server so Playwright can start its own, or start yours with that variable.",
    );
  }
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

async function calls(page: Page): Promise<Call[]> {
  return JSON.parse((await page.getByTestId("calls").textContent()) ?? "[]");
}

/** Pick a pill card the way a user does: click its visible label. */
const choose = (page: Page, label: string) =>
  page
    .locator("label", { hasText: label })
    .filter({ has: page.getByRole("radio", { name: label }) })
    .click();

const next = (page: Page) =>
  page.getByRole("button", { name: /^(continue|choose companies)/i });

async function fillName(page: Page, first = "Ann", last = "Lee") {
  await page.getByLabel("First name").fill(first);
  await page.getByLabel("Last name").fill(last);
}

test.describe("happy path", () => {
  test("name → about → welcome → watchlist → finished", async ({ page }) => {
    await open(page);

    await expect(
      page.getByRole("heading", { level: 1, name: "What should we call you?" }),
    ).toBeVisible();
    await expect(page.getByText("Step 1 of 4")).toBeVisible();
    await fillName(page);
    await next(page).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "About you" }),
    ).toBeVisible();
    await expect(page.getByText("Step 2 of 4")).toBeVisible();
    await choose(page, "Retail investor");
    await choose(page, "Intermediate");
    await next(page).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "Welcome to EquityCairn" }),
    ).toBeVisible();
    await expect(page.getByText("Step 3 of 4")).toBeVisible();
    await expect(
      page.getByText("Publisher and original link stay visible."),
    ).toBeVisible();
    await next(page).click();

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Choose companies to follow",
      }),
    ).toBeVisible();
    await expect(page.getByText("Step 4 of 4")).toBeVisible();
    await page.getByRole("checkbox", { name: /apple/i }).check();
    await page.getByRole("checkbox", { name: /nvidia/i }).check();
    await next(page).click();

    await expect(page.getByText("Onboarding finished")).toBeVisible();
    expect(await calls(page)).toEqual([
      { action: "saveName", args: ["Ann", "Lee"] },
      { action: "saveAbout", args: ["retail_investor", "intermediate"] },
      { action: "saveWatchlist", args: ["AAPL NVDA"] },
      { action: "finish", args: [] },
    ]);
  });

  test("progress bar advances with each step", async ({ page }) => {
    await open(page);
    const bar = page.getByRole("progressbar", { name: "Onboarding progress" });
    await expect(bar).toHaveAttribute("aria-valuenow", "25");
    await fillName(page);
    await next(page).click();
    await expect(bar).toHaveAttribute("aria-valuenow", "50");
    await next(page).click();
    await expect(bar).toHaveAttribute("aria-valuenow", "75");
    await next(page).click();
    await expect(bar).toHaveAttribute("aria-valuenow", "100");
  });
});

test.describe("name step", () => {
  test("requires both names before saving", async ({ page }) => {
    await open(page);
    await next(page).click();
    await expect(page.getByLabel("First name")).toBeFocused();
    expect(await calls(page)).toEqual([]);
  });

  test("shows the server's validation error and stays put", async ({
    page,
  }) => {
    await open(page, "?fail=saveName");
    await fillName(page, "Ann1", "Lee");
    await next(page).click();
    await expect(page.getByText(/use letters, spaces/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "What should we call you?" }),
    ).toBeVisible();
  });

  test("disables the button while saving", async ({ page }) => {
    await open(page, "?delay=800");
    await fillName(page);
    const button = next(page);
    await button.click();
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute("aria-busy", "true");
    await expect(
      page.getByRole("heading", { level: 1, name: "About you" }),
    ).toBeVisible();
    expect(
      (await calls(page)).filter((c) => c.action === "saveName"),
    ).toHaveLength(1);
  });
});

test.describe("about step", () => {
  test("Skip for now saves no answers and moves on", async ({ page }) => {
    await open(page, "?step=about");
    await page.getByRole("button", { name: "Skip for now" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Welcome to EquityCairn" }),
    ).toBeVisible();
    expect(await calls(page)).toEqual([
      { action: "saveAbout", args: ["", ""] },
    ]);
  });

  test("Skip clears answers already chosen", async ({ page }) => {
    await open(page, "?step=about");
    await choose(page, "Other");
    await page.getByRole("button", { name: "Skip for now" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Welcome to EquityCairn" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("radio", { name: "Other" })).not.toBeChecked();
  });

  test("an answer can be changed and only one is selected", async ({
    page,
  }) => {
    await open(page, "?step=about");
    await choose(page, "Other");
    await choose(page, "Financial adviser");
    await expect(page.getByRole("radio", { name: "Other" })).not.toBeChecked();
    await next(page).click();
    expect(await calls(page)).toEqual([
      { action: "saveAbout", args: ["financial_adviser", ""] },
    ]);
  });

  test("the cards work from the keyboard", async ({ page }) => {
    await open(page, "?step=about");
    await page.getByRole("radio", { name: "Retail investor" }).focus();
    await page.keyboard.press("Space");
    await expect(
      page.getByRole("radio", { name: "Retail investor" }),
    ).toBeChecked();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("radio", { name: "Institutional investor" }),
    ).toBeChecked();
  });

  test("Back returns to the name step with the name kept", async ({ page }) => {
    await open(page, "?step=about");
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByLabel("First name")).toHaveValue("Ann");
    await expect(page.getByLabel("Last name")).toHaveValue("Lee");
  });
});

test.describe("watchlist step", () => {
  test("selecting updates the count and the watchlist panel", async ({
    page,
    isMobile,
  }) => {
    await open(page, "?step=watchlist");
    await expect(page.getByText("0 selected")).toBeVisible();
    await page.getByRole("checkbox", { name: /apple/i }).check();
    await page.getByRole("checkbox", { name: /microsoft/i }).check();
    await expect(page.getByText("2 selected")).toBeVisible();
    if (!isMobile) {
      await expect(page.getByText("2 / 10")).toBeVisible();
      await expect(page.getByText("Apple Inc.").last()).toBeVisible();
    }
  });

  test("search narrows the list by name or ticker", async ({ page }) => {
    await open(page, "?step=watchlist");
    const search = page.getByRole("searchbox", { name: "Search companies" });
    await search.fill("visa");
    await expect(page.getByRole("checkbox")).toHaveCount(1);
    await search.fill("jnj");
    await expect(
      page.getByRole("checkbox", { name: /johnson/i }),
    ).toBeVisible();
    await search.fill("123");
    await expect(
      page.getByText("No companies match your search."),
    ).toBeVisible();
  });

  test("category chips filter the list", async ({ page }) => {
    await open(page, "?step=watchlist");
    const all = await page.getByRole("checkbox").count();
    await page.getByRole("button", { name: "Finance" }).click();
    await expect(page.getByRole("button", { name: "Finance" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const finance = await page.getByRole("checkbox").count();
    expect(finance).toBeGreaterThan(0);
    expect(finance).toBeLessThan(all);
    await expect(page.getByRole("checkbox", { name: /visa/i })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /apple/i })).toHaveCount(0);
    await page.getByRole("button", { name: "All" }).click();
    await expect(page.getByRole("checkbox")).toHaveCount(all);
  });

  test("a ticker outside the list can be added and is saved", async ({
    page,
  }) => {
    await open(page, "?step=watchlist");
    await page
      .getByRole("searchbox", { name: "Search companies" })
      .fill("zzzz");
    await page
      .getByRole("button", { name: "Add “ZZZZ” to your watchlist" })
      .click();
    await expect(page.getByRole("searchbox")).toHaveValue("");
    await expect(page.getByText("1 selected")).toBeVisible();
    // Visible and removable in the list itself (mobile has no watchlist panel).
    await expect(
      page.getByRole("checkbox", { name: "ZZZZ (custom ticker)" }),
    ).toBeChecked();
    await next(page).click();
    await expect(page.getByText("Onboarding finished")).toBeVisible();
    expect(await calls(page)).toContainEqual({
      action: "saveWatchlist",
      args: ["ZZZZ"],
    });
  });

  test("text that is not a ticker offers no add button", async ({ page }) => {
    await open(page, "?step=watchlist");
    await page
      .getByRole("searchbox", { name: "Search companies" })
      .fill("not a ticker");
    await expect(page.getByRole("button", { name: /^Add “/ })).toHaveCount(0);
  });

  test("saved tickers come back selected and can be removed", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "the removable watchlist panel is desktop-only");
    await open(page, "?step=watchlist&tickers=AAPL,ZZZZ");
    await expect(page.getByRole("checkbox", { name: /apple/i })).toBeChecked();
    // Once in the list, once in the watchlist panel.
    await expect(page.getByText("Custom ticker")).toHaveCount(2);
    await page.getByRole("button", { name: "Remove ZZZZ" }).click();
    await expect(page.getByText("Custom ticker")).toHaveCount(0);
    await page.getByRole("button", { name: "Remove AAPL" }).click();
    await expect(
      page.getByRole("checkbox", { name: /apple/i }),
    ).not.toBeChecked();
    await expect(page.getByText(/no companies yet/i)).toBeVisible();
  });

  test("stops at 10 companies and explains why", async ({ page }) => {
    await open(page, "?step=watchlist");
    const boxes = page.getByRole("checkbox");
    const total = await boxes.count();
    expect(total).toBeGreaterThan(10);
    for (let i = 0; i < 10; i++) await boxes.nth(i).check();
    await expect(page.getByText("10 selected")).toBeVisible();
    await boxes.nth(10).click();
    await expect(
      page.getByText(/you can follow up to 10 companies/i),
    ).toBeVisible();
    await expect(boxes.nth(10)).not.toBeChecked();
    await expect(page.getByText("10 selected")).toBeVisible();
    // Removing one frees a slot.
    await boxes.nth(0).uncheck();
    await boxes.nth(10).check();
    await expect(page.getByText("10 selected")).toBeVisible();
  });

  test("I'll do this later finishes without saving a list", async ({
    page,
  }) => {
    await open(page, "?step=watchlist");
    await page.getByRole("button", { name: "I’ll do this later" }).click();
    await expect(page.getByText("Onboarding finished")).toBeVisible();
    expect((await calls(page)).map((c) => c.action)).toEqual(["finish"]);
  });

  test("a failed save keeps the user on the step and does not finish", async ({
    page,
  }) => {
    await open(page, "?step=watchlist&fail=saveWatchlist");
    await next(page).click();
    await expect(page.getByText(/one to six letters/i)).toBeVisible();
    await expect(page.getByText("Onboarding finished")).toHaveCount(0);
    expect((await calls(page)).map((c) => c.action)).toEqual(["saveWatchlist"]);
  });

  test("a failed finish shows an error", async ({ page }) => {
    await open(page, "?step=watchlist&fail=finish");
    await next(page).click();
    await expect(page.getByText(/something went wrong/i)).toBeVisible();
    await expect(page.getByText("Onboarding finished")).toHaveCount(0);
  });

  test("Back returns to the welcome step", async ({ page }) => {
    await open(page, "?step=watchlist");
    await page.getByRole("button", { name: "Back" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Welcome to EquityCairn" }),
    ).toBeVisible();
  });
});

test.describe("layout", () => {
  test("desktop shows the stepper rail and the info card", async ({
    page,
    isMobile,
  }) => {
    test.skip(!!isMobile, "desktop layout");
    await open(page, "?step=about");
    const steps = page.getByRole("navigation", { name: "Onboarding steps" });
    await expect(steps.getByRole("listitem")).toHaveCount(4);
    await expect(steps.getByRole("listitem").nth(1)).toHaveAttribute(
      "aria-current",
      "step",
    );
    await expect(steps.getByText("Your name (completed)")).toBeAttached();
    await expect(page.getByText("Why we ask")).toBeVisible();
    await expect(
      page.getByText("SET UP YOUR FEED", { exact: false }),
    ).toBeVisible();
    // Three columns: rail, form, info card side by side.
    const rail = await steps.boundingBox();
    const info = await page.getByText("Why we ask").boundingBox();
    expect(rail!.x + rail!.width).toBeLessThan(info!.x);
  });

  test("mobile hides the rail and info card and pins the action bar", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "mobile layout");
    await open(page, "?step=watchlist");
    await expect(page.getByText("04 / 04")).toBeVisible();
    await expect(page.getByText("Your onboarding")).toBeHidden();
    await expect(
      page.getByRole("heading", { name: "Your watchlist" }),
    ).toBeHidden();
    // The list is longer than the screen, yet Continue stays reachable.
    const viewport = page.viewportSize()!;
    const box = await next(page).boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    await expect(next(page)).toBeInViewport();
  });

  test("no horizontal scrolling on any step", async ({ page }) => {
    for (const step of ["name", "about", "welcome", "watchlist"]) {
      await open(page, `?step=${step}`);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, step).toBeLessThanOrEqual(0);
    }
  });

  test("uses the dark theme tokens", async ({ page }) => {
    await open(page, "?step=about");
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      "rgb(7, 31, 34)",
    );
  });
});

test.describe("keyboard", () => {
  test("Enter in the watchlist search adds a ticker instead of finishing", async ({
    page,
  }) => {
    await open(page, "?step=watchlist");
    await page
      .getByRole("searchbox", { name: "Search companies" })
      .fill("tsla");
    await page.keyboard.press("Enter");
    await expect(page.getByText("1 selected")).toBeVisible();
    await expect(page.getByText("Onboarding finished")).toHaveCount(0);
    expect(await calls(page)).toEqual([]);
  });

  test("radio groups are named for assistive tech", async ({ page }) => {
    await open(page, "?step=about");
    await expect(
      page.getByRole("radiogroup", { name: "What best describes your role?" }),
    ).toBeVisible();
    await expect(
      page.getByRole("radiogroup", {
        name: "How would you describe your experience?",
      }),
    ).toBeVisible();
  });
});

test.describe("edge cases", () => {
  test("a short ticker can be added even though it appears inside company names", async ({
    page,
  }) => {
    await open(page, "?step=watchlist");
    await page.getByRole("searchbox", { name: "Search companies" }).fill("f");
    await page
      .getByRole("button", { name: "Add “F” to your watchlist" })
      .click();
    await expect(page.getByText("1 selected")).toBeVisible();
  });

  test("an over-limit saved list blocks Continue with an explanation", async ({
    page,
  }) => {
    await open(
      page,
      "?step=watchlist&tickers=AAPL,NVDA,MSFT,V,JNJ,KO,GOOGL,AMZN,JPM,PFE,MCD,MA",
    );
    await next(page).click();
    await expect(page.getByText(/remove 2 to continue/i)).toBeVisible();
    expect(await calls(page)).toEqual([]);
  });

  test("Clear drops one answer and keeps the other", async ({ page }) => {
    await open(page, "?step=about");
    await choose(page, "Other");
    await choose(page, "Beginner");
    await page
      .getByRole("button", {
        name: "Clear answer: How would you describe your experience?",
      })
      .click();
    await next(page).click();
    expect(await calls(page)).toEqual([
      { action: "saveAbout", args: ["other", ""] },
    ]);
  });
});
