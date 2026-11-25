import { expect, test, type Page } from "@playwright/test";

import { calls, expectNoSidewaysScroll } from "./helpers";

const LONG = "x".repeat(200);
const h1 = (page: Page, name: string) =>
  page.getByRole("heading", { level: 1, name });

for (const [name, path] of [
  ["no token", "/join-beta"],
  ["junk token", "/join-beta?token=junk"],
  ["over-long token", `/join-beta?token=${LONG}`],
]) {
  test(`/join-beta with ${name} shows the invalid state`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(h1(page, "This link isn't valid")).toBeVisible();
    await expect(page.getByTestId("auth-card")).toBeVisible();
    await expect(page.locator("main").getByRole("button")).toHaveCount(0);
    await expectNoSidewaysScroll(page);
    await page
      .getByRole("main")
      .getByRole("link", { name: "Back to home" })
      .click();
    await expect(page).toHaveURL(/\/$/);
  });
}

for (const [name, path] of [
  ["no token", "/join-beta/verify"],
  ["junk token", "/join-beta/verify?token=junk"],
  ["over-long token", `/join-beta/verify?token=${LONG}`],
]) {
  test(`/join-beta/verify with ${name} shows the invalid state`, async ({
    page,
  }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(h1(page, "This link is invalid or has expired")).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "Join the beta" }),
    ).toHaveAttribute("href", "/#join");
  });
}

// Token states need the database, so they render on the fake page.
async function open(page: Page, query: string) {
  await page.goto(`/e2e-auth?${query}`);
  await page.waitForSelector("body[data-hydrated=true]");
}

test("check your email: counts down, then resends", async ({ page }) => {
  await page.clock.install();
  await open(page, "screen=beta-check&cooldown=30");
  await expect(h1(page, "Check your email")).toBeVisible();
  await expect(page.getByText("Confirmation email sent.")).toBeVisible();
  await expect(page.getByRole("main")).not.toContainText("@");
  await expect(
    page.getByRole("button", { name: /Re-send available in 0:/ }),
  ).toBeDisabled();
  await page.clock.runFor(31_000);
  await page.getByRole("button", { name: "Resend confirmation email" }).click();
  await expect(page.getByText("we've sent a new link")).toBeVisible();
  expect(await calls(page)).toEqual([
    { action: "resendVerification", args: ["fake-token"] },
  ]);
  await expect(
    page.getByRole("main").getByRole("link", { name: "Back to home" }),
  ).toHaveAttribute("href", "/");
});

test("check your email: shows a failed resend", async ({ page }) => {
  await open(page, "screen=beta-check&cooldown=0&result=server_error");
  await page.getByRole("button", { name: "Resend confirmation email" }).click();
  await expect(
    page.getByText("Something went wrong, please try again"),
  ).toBeVisible();
});

for (const [result, title, notice] of [
  ["verified", "You're on the list", "Your email address is confirmed."],
  ["already_verified", "Already verified", "Your email address is confirmed."],
]) {
  test(`verification result ${result}`, async ({ page }) => {
    await open(page, `screen=verify&result=${result}`);
    await expect(h1(page, title)).toBeVisible();
    await expect(page.getByText(notice)).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "Back to home" }),
    ).toHaveAttribute("href", "/");
  });
}
