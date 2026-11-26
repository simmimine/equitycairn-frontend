import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createServerClient = vi.hoisted(() => vi.fn());
vi.mock("@supabase/ssr", () => ({ createServerClient }));

import { proxy } from "./proxy";

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
});
