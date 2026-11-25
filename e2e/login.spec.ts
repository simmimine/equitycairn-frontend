import { expect, test, type Page } from "@playwright/test";

import {
  COLOR,
  calls,
  expectNoSidewaysScroll,
  hydrated,
  isMobile,
} from "./helpers";

const h1 = (page: Page, name: string) =>
  page.getByRole("heading", { level: 1, name });

/** The login flow wired to fake actions; no Supabase, no email. */
async function openFlow(page: Page, query = "") {
  await page.goto(`/e2e-auth?screen=login&${query}`);
  await page.waitForSelector("body[data-hydrated=true]");
}

async function submitEmail(page: Page, email = "Ann@Example.com") {
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Continue" }).click();
}

test.describe("/login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("shows the email card from the board", async ({ page }) => {
    await expect(h1(page, "Log in")).toBeVisible();
    await expect(page.getByText("Enter your email to continue.")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute(
      "placeholder",
      "you@example.com",
    );
    await expect(
      page.getByText("Only verified beta members can create an account."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "New to the beta? Join the beta" }),
    ).toHaveAttribute("href", "/#join");
  });

  test("lays out brand panel and card for this screen size", async ({
    page,
  }) => {
    const panel = page.getByRole("complementary", {
      name: "About EquityCairn",
    });
    if (isMobile(page)) {
      await expect(panel).toBeHidden();
    } else {
      await expect(panel).toContainText(
        "Company news, organized around your watchlist.",
      );
      await expect(panel).toContainText("No buy/sell advice or predictions.");
      const a = (await panel.boundingBox())!;
      const b = (await page.getByTestId("auth-card").boundingBox())!;
      expect(b.x).toBeGreaterThan(a.x + a.width);
      expect(Math.abs(a.y - b.y)).toBeLessThan(2);
    }
    await expect(page.getByRole("contentinfo")).toContainText(
      "Informational news, not investment advice.",
    );
    await expectNoSidewaysScroll(page);
  });

  test("rejects an invalid email", async ({ page }) => {
    await hydrated(page, "#login-email");
    await submitEmail(page, "nope");
    await expect(page.getByText("Enter a valid email address")).toBeVisible();
  });

  test("the header link goes home", async ({ page }) => {
    await page
      .getByRole("banner")
      .getByRole("link", { name: isMobile(page) ? "Home" : "Back to home" })
      .click();
    await expect(page).toHaveURL(/\/$/);
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`uses the ${scheme} board colours`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.reload();
      const c = COLOR[scheme];
      await expect(page.locator("body")).toHaveCSS("background-color", c.page);
      const card = page.getByTestId("auth-card");
      await expect(card).toHaveCSS("background-color", c.card);
      await expect(card).toHaveCSS("border-top-color", c.border);
    });
  }
});

test.describe("login flow", () => {
  test("existing account: sign in, change email, bad password", async ({
    page,
  }) => {
    await openFlow(page, "state=has_account&signIn=invalid_credentials");
    await submitEmail(page);
    await expect(h1(page, "Welcome back")).toBeVisible();
    await expect(page.getByTestId("email-chip")).toContainText(
      "ann@example.com",
    );

    await page.getByRole("button", { name: "Change" }).click();
    await expect(h1(page, "Log in")).toBeVisible();
    await submitEmail(page);
    await page.getByRole("button", { name: "Use a different email" }).click();
    await expect(h1(page, "Log in")).toBeVisible();
    await submitEmail(page);

    await page.getByLabel("Password").fill("wrong-password-1");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByText("Email or password is incorrect"),
    ).toBeVisible();
    expect((await calls(page)).at(-1)).toEqual({
      action: "signIn",
      args: ["ann@example.com", "wrong-password-1"],
    });
  });

  for (const [error, message] of [
    ["unconfirmed", "Your account isn't confirmed yet."],
    ["rate_limited", "Too many attempts."],
    ["server_error", "Something went wrong, please try again"],
  ]) {
    test(`sign in shows the ${error} error`, async ({ page }) => {
      await openFlow(page, `state=has_account&signIn=${error}`);
      await submitEmail(page);
      await page.getByLabel("Password").fill("some-password-1");
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByText(message)).toBeVisible();
    });
  }

  test("new account: create password, then resend after the cooldown", async ({
    page,
  }) => {
    await page.clock.install();
    await openFlow(page, "state=no_account");
    await submitEmail(page);
    await expect(h1(page, "Create your password")).toBeVisible();
    await expect(page.getByTestId("email-chip")).toContainText(
      "ann@example.com",
    );
    await expect(page.getByText("At least 12 characters.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Change" })).toHaveCount(0);

    const password = page.getByLabel("Password", { exact: true });
    await expect(password).toHaveAttribute(
      "placeholder",
      "Enter your password",
    );
    await password.fill("Zq9!kd2#vL0w");
    await page.getByLabel("Confirm password").fill("Zq9!kd2#vL0w");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(h1(page, "Check your email")).toBeVisible();
    await expect(
      page.getByText("Account confirmation link sent to ann@example.com."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Re-send available in/ }),
    ).toBeDisabled();
    await page.clock.runFor(61_000);
    await page
      .getByRole("button", { name: "Resend confirmation email" })
      .click();
    await expect(page.getByText("we've sent a new email")).toBeVisible();
    expect(
      (await calls(page)).filter((c) => c.action === "createAccount"),
    ).toHaveLength(2);

    await page.getByRole("button", { name: "Back to log in" }).click();
    await expect(h1(page, "Log in")).toBeVisible();
  });

  for (const [error, message] of [
    ["mismatch", "Passwords don't match"],
    ["too_short", "Use at least 12 characters"],
    ["common", "That password is too common"],
    ["not_member", "This email isn't a verified beta member"],
    ["has_account", "This email already has an account."],
    ["cooldown", "Please wait a minute before trying again"],
  ]) {
    test(`create account shows the ${error} error`, async ({ page }) => {
      await openFlow(page, `state=no_account&create=${error}`);
      await submitEmail(page);
      await page.getByLabel("Password", { exact: true }).fill("abc");
      await page.getByLabel("Confirm password").fill("abc");
      await page.getByRole("button", { name: "Create account" }).click();
      await expect(page.getByText(message)).toBeVisible();
    });
  }

  test("create account goes back to email", async ({ page }) => {
    await openFlow(page, "state=no_account");
    await submitEmail(page);
    await page.getByRole("button", { name: "Back to email" }).click();
    await expect(h1(page, "Log in")).toBeVisible();
  });

  test("an address that is not on the list is sent to the beta", async ({
    page,
  }) => {
    await openFlow(page, "state=not_listed");
    await submitEmail(page);
    await expect(
      h1(page, "This email isn't on the beta list yet"),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "Join the beta" }),
    ).toHaveAttribute("href", "/#join");
  });

  test("an unverified sign-up can ask for a new link", async ({ page }) => {
    await openFlow(page, "state=unverified");
    await submitEmail(page);
    await expect(h1(page, "Verify your beta sign-up first")).toBeVisible();
    await page
      .getByRole("button", { name: "Resend confirmation email" })
      .click();
    await expect(page.getByText("we've sent a new email")).toBeVisible();
    expect((await calls(page)).at(-1)).toEqual({
      action: "resendBetaVerification",
      args: ["ann@example.com"],
    });
  });

  test("works with the keyboard alone", async ({ page }) => {
    await openFlow(page, "state=has_account");
    await page.getByLabel("Email").focus();
    await page.keyboard.type("ann@example.com");
    await page.keyboard.press("Enter");
    await expect(h1(page, "Welcome back")).toBeVisible();
    await page.getByLabel("Password").focus();
    await page.keyboard.type("right-password-1");
    await page.keyboard.press("Enter");
    await expect
      .poll(async () => (await calls(page)).at(-1)?.action)
      .toBe("signIn");
  });
});

for (const path of ["/feed", "/onboarding"]) {
  test(`${path} redirects signed-out visitors to /login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  });
}

test.describe("/auth/confirm", () => {
  test("without params shows the invalid state", async ({ page }) => {
    await page.goto("/auth/confirm");
    await expect(h1(page, "This link isn't valid")).toBeVisible();
    await expect(page.getByLabel("Password")).toHaveCount(0);
    await page.getByRole("link", { name: "Back to log in" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("with params only renders a password form", async ({ page }) => {
    await page.goto("/auth/confirm?token_hash=abc123&email=a%40example.com");
    await expect(h1(page, "Confirm your account")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByText("Enter the password you chose when you signed up."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Finish creating account" }),
    ).toBeVisible();
  });

  for (const [error, message] of [
    ["wrong_password", "That doesn't match the password you created."],
    ["expired", "This link has expired or was already used."],
    ["rate_limited", "Too many attempts."],
    ["server_error", "Something went wrong, please try again."],
  ]) {
    test(`shows the ${error} error`, async ({ page }) => {
      await page.goto(`/e2e-auth?screen=confirm&result=${error}`);
      await page.waitForSelector("body[data-hydrated=true]");
      await page.getByLabel("Password").fill("my-password-123");
      await page
        .getByRole("button", { name: "Finish creating account" })
        .click();
      await expect(page.getByText(message)).toBeVisible();
      await expect(page.getByRole("link", { name: "Start again" })).toHaveCount(
        error === "expired" ? 1 : 0,
      );
    });
  }
});
