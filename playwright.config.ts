import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT) || 3100;

export default defineConfig({
  testDir: "./e2e",
  // `next dev` compiles each route on its first request; do that once up front so
  // specs never race a cold compile (see e2e/global-setup.ts).
  globalSetup: "./e2e/global-setup.ts",
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      // Onboarding is the one flow designed mobile-first; run it on a phone too.
      name: "mobile",
      testMatch: /onboarding\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${port}`,
    url: `http://localhost:${port}`,
    env: { E2E_FAKE_ONBOARDING: "1" },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
