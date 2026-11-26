import { expect, test, type Page } from "@playwright/test";

import {
  calls,
  expectNoSidewaysScroll,
  expectTestPage,
  isMobile,
} from "./helpers";

// Drives the real settings screens with fake actions (see src/app/e2e-settings).
// Runs in the desktop and mobile projects.

async function open(page: Page, query = "") {
  await page.goto(`/e2e-settings${query}`);
  await expectTestPage(
    page,
    page.locator("body[data-hydrated=true]"),
    "/e2e-settings",
    "E2E_FAKE_SETTINGS",
  );
  await page.evaluate(() => document.fonts.ready);
}

const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const region = (page: Page, name: string) =>
  page.getByRole("region", { name, exact: true });
const searchBox = (page: Page) =>
  page.getByRole("combobox", { name: "Search settings" });

test("shows all six sections", async ({ page }) => {
  await open(page);
  for (const name of [
    "Profile",
    "Appearance",
    "Account and security",
    "Subscription",
    "Report a bug",
    "Privacy and help",
  ]) {
    await expect(region(page, name)).toBeVisible();
  }
});

test("saves the profile", async ({ page }) => {
  await open(page);
  await page.getByLabel("First name").fill("Sam");
  await button(page, "Save changes").click();
  await expect(page.getByText("Changes saved.")).toBeVisible();
  expect(await calls(page)).toEqual([
    {
      action: "saveProfile",
      args: [
        {
          firstName: "Sam",
          lastName: "Example",
          role: "retail_investor",
          experience: "intermediate",
        },
      ],
    },
  ]);
});

test("switches theme at once", async ({ page }) => {
  await open(page);
  const appearance = region(page, "Appearance");
  await appearance.getByText("Dark", { exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await appearance.getByText("Light", { exact: true }).click();
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
});

test("asks for each emailed link", async ({ page }) => {
  await open(page);
  await button(page, "Change password").click();
  await expect(
    page.getByText("We sent a link to you@example.com. It lasts 30 minutes."),
  ).toBeVisible();
  await button(page, "Delete account").click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      { action: "requestLink", args: ["password_change"] },
      { action: "requestLink", args: ["account_delete"] },
    ]);
});

test("sends a bug report", async ({ page }) => {
  await open(page);
  await page.getByLabel("What happened?").fill("It broke");
  await button(page, "Send report").click();
  await expect(page.getByText("Thanks, your report was sent.")).toBeVisible();
  const [call] = await calls(page);
  expect(call.args[0]).toMatchObject({
    whatHappened: "It broke",
    pagePath: "/feed",
    screen: expect.stringMatching(/^\d+x\d+$/),
  });
});

test("search by shortcut goes to a setting without pressing it", async ({
  page,
}) => {
  await open(page);
  await page.keyboard.press("Control+k");
  await expect(searchBox(page)).toBeFocused();
  await searchBox(page).fill("delete");
  await expect(page.getByRole("option")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(button(page, "Delete account")).toBeFocused();
  await expect(button(page, "Delete account")).toBeInViewport();
  expect(await calls(page)).toEqual([]);
});

test("a chosen result is clear of the header and tab bar", async ({ page }) => {
  await open(page);
  if (isMobile(page)) await button(page, "Search").click();
  else await searchBox(page).click();
  await searchBox(page).fill("privacy");
  await page.getByRole("option").click();
  const header = (await page.getByRole("banner").boundingBox())!;
  const target = (await region(page, "Privacy and help").boundingBox())!;
  expect(target.y).toBeGreaterThanOrEqual(header.y + header.height);
});

for (const [view, label, action] of [
  ["confirm-delete", "Delete my account", "deleteAccount"],
  ["confirm-password", "Change password", "changePassword"],
] as const) {
  test(`${view} does nothing until pressed`, async ({ page }) => {
    await open(page, `?view=${view}`);
    expect(await calls(page)).toEqual([]);
    if (view === "confirm-password") {
      await page
        .getByLabel("New password", { exact: true })
        .fill("x".repeat(14));
      await page.getByLabel("Confirm new password").fill("x".repeat(14));
    }
    await button(page, label).click();
    await expect.poll(async () => (await calls(page))[0]?.action).toBe(action);
  });
}

test("has no sideways scroll at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await open(page);
  await expectNoSidewaysScroll(page);
});

test("/settings redirects signed-out visitors to /login", async ({ page }) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login$/);
});
