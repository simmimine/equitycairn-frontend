import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookies = vi.fn();
const connection = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: () => cookies() }));
vi.mock("next/server", () => ({ connection: () => connection() }));
vi.mock("next/navigation", () => ({
  redirect: (u: string) => {
    throw new Error(`NEXT_REDIRECT:${u}`);
  },
}));

import { createSessionClient } from "./session";

const KEYS = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  cookies.mockReset();
  connection.mockReset();
  connection.mockResolvedValue(undefined);
  cookies.mockResolvedValue({ getAll: () => [], set: vi.fn() });
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("createSessionClient", () => {
  it("reads the request cookies before checking configuration, so builds treat the route as dynamic", async () => {
    await expect(createSessionClient()).rejects.toThrow(/SUPABASE_URL/);
    expect(cookies).toHaveBeenCalled();
  });

  it("waits for the request before building the client, which reads the clock", async () => {
    process.env.SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    await createSessionClient();
    expect(connection).toHaveBeenCalled();
  });

  it("builds a client when configured", async () => {
    process.env.SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    const client = await createSessionClient();
    expect(typeof client.auth.getUser).toBe("function");
  });
});
