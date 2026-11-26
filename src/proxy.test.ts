import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createServerClient = vi.hoisted(() => vi.fn());
vi.mock("@supabase/ssr", () => ({ createServerClient }));

import { config, proxy } from "./proxy";

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "http://localhost:54321");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  createServerClient.mockReset();
  createServerClient.mockReturnValue({
    auth: { getClaims: async () => ({ data: { claims: { sub: "u1" } } }) },
  });
});

afterEach(() => vi.unstubAllEnvs());

describe("proxy", () => {
  it("hides the refreshed session cookie from page scripts", async () => {
    await proxy(new NextRequest("http://localhost/feed"));
    expect(createServerClient.mock.lastCall?.[2].cookieOptions).toEqual({
      httpOnly: true,
    });
  });

  it("guards the settings page", async () => {
    expect(config.matcher).toContain("/settings/:path*");
    createServerClient.mockReturnValue({
      auth: { getClaims: async () => ({ data: null }) },
    });
    const response = await proxy(new NextRequest("http://localhost/settings"));
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("lets a settings action through so it can say the session ended", async () => {
    createServerClient.mockReturnValue({
      auth: { getClaims: async () => ({ data: null }) },
    });
    const action = (path: string) =>
      proxy(
        new NextRequest(`http://localhost${path}`, {
          method: "POST",
          headers: { "next-action": "abc" },
        }),
      );
    expect((await action("/settings")).headers.get("location")).toBeNull();
    expect((await action("/feed")).headers.get("location")).not.toBeNull();
  });
});
