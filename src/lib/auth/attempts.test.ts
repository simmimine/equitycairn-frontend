import { beforeEach, describe, expect, it, vi } from "vitest";

import { FakeDb } from "@/lib/signup/store.test-helpers";

const db = new FakeDb();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: () => db }));

import { checkAttempts } from "./attempts";

const LIMIT = { max: 3, windowSeconds: 600 };

beforeEach(() => {
  db.rpcCalls = [];
});

describe("checkAttempts", () => {
  it("maps 0 to allowed and passes scoped key, window and max", async () => {
    db.rpcImpl = () => 0;
    expect(await checkAttempts("login-pw", "abc", LIMIT)).toEqual({
      allowed: true,
    });
    expect(db.rpcCalls).toEqual([
      {
        fn: "bump_attempts",
        args: { p_key: "login-pw:abc", p_window_seconds: 600, p_max: 3 },
      },
    ]);
  });

  it("maps a positive result to retryAfterSeconds", async () => {
    db.rpcImpl = () => 42;
    expect(await checkAttempts("login-email", "abc", LIMIT)).toEqual({
      allowed: false,
      retryAfterSeconds: 42,
    });
  });

  it("throws on a malformed result", async () => {
    db.rpcImpl = () => null;
    await expect(checkAttempts("confirm", "abc", LIMIT)).rejects.toThrow();
  });
});
