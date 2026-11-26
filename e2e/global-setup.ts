import type { FullConfig } from "@playwright/test";

const ROUTES = [
  "/",
  "/login",
  "/join-beta",
  "/join-beta/verify",
  "/auth/confirm",
  "/onboarding",
  "/feed",
  "/e2e-onboarding",
  "/e2e-auth",
  "/e2e-feed",
  "/e2e-settings",
  "/settings",
  "/account/confirm",
];

/** Warms every route the specs visit so dev-server compilation can't cause timeouts. */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL;
  await Promise.all(
    ROUTES.map((route) =>
      // Redirects and 404s are fine: the point is only to trigger compilation.
      fetch(`${baseURL}${route}`, { redirect: "manual" }).catch(
        () => undefined,
      ),
    ),
  );
}
