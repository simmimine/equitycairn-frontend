import { expect, test } from "@playwright/test";

const LONG = "x".repeat(200);

for (const [name, path] of [
  ["no token", "/join-beta"],
  ["junk token", "/join-beta?token=junk"],
  ["over-long token", `/join-beta?token=${LONG}`],
]) {
  test(`/join-beta with ${name} shows the invalid state`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: "This link isn't valid" }),
    ).toBeVisible();
    await expect(page.locator("main").getByRole("button")).toHaveCount(0);
    await page.getByRole("link", { name: "Back to home" }).click();
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
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "This link is invalid or has expired",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Join the beta" }),
    ).toHaveAttribute("href", "/#join");
  });
}
