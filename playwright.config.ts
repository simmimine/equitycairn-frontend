import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT) || 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm dev --port ${port}`,
    url: `http://localhost:${port}`,
    env: { E2E_FAKE_ONBOARDING: "1" },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
