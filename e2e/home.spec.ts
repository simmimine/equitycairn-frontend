import { expect, test } from "@playwright/test";

const TAGLINE = "The market news that matters to your watchlist.";

test("home page shows the tagline heading", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: TAGLINE }),
  ).toBeVisible();
});

test("submitting an invalid email shows an inline error", async ({ page }) => {
  await page.goto("/");
  const join = page.locator("#join");
  await join.getByRole("textbox", { name: "Email" }).fill("not-an-email");
  await join.getByRole("button", { name: "Join the beta" }).click();
  await expect(join.getByText("Enter a valid email address")).toBeVisible();
});

test("the header button scrolls to the sign-up form", async ({ page }) => {
  await page.goto("/");
  const input = page.locator("#hero-email");
  await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
  await expect(input).not.toBeInViewport();
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Join the beta" })
    .click();
  await expect(page).toHaveURL(/#join$/);
  await expect(input).toBeInViewport();
});
