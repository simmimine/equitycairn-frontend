import { expect, test } from "@playwright/test";

test("/login shows the email card and rejects an invalid email", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { level: 1, name: "Log in" }),
  ).toBeVisible();
  await page.getByLabel("Email").fill("nope");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Enter a valid email address")).toBeVisible();
});

for (const path of ["/feed", "/onboarding"]) {
  test(`${path} redirects signed-out visitors to /login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  });
}

test("/auth/confirm without params shows the invalid state", async ({
  page,
}) => {
  await page.goto("/auth/confirm");
  await expect(
    page.getByRole("heading", { level: 1, name: "This link isn't valid" }),
  ).toBeVisible();
  await expect(page.getByLabel("Password")).toHaveCount(0);
});

test("/auth/confirm with params only renders a password form", async ({
  page,
}) => {
  await page.goto("/auth/confirm?token_hash=abc123&email=a%40example.com");
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Finish creating account" }),
  ).toBeVisible();
});

test("the landing header links to /login", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Log in" }).first().click();
  await expect(page).toHaveURL(/\/login$/);
});
