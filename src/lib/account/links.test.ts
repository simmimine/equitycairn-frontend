import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: unknown[][] = [];
let result: { data?: unknown; error: { message: string } | null };

/** Records the query chain; awaiting it yields `result`. */
function query() {
  const q: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => resolve(result),
  };
  for (const m of [
    "upsert",
    "insert",
    "delete",
    "update",
    "select",
    "eq",
    "gt",
    "maybeSingle",
  ])
    q[m] = (...args: unknown[]) => {
      calls.push([m, ...args]);
      return q;
    };
  return q;
}

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      calls.push(["from", table]);
      return query();
    },
  }),
}));

import { hashToken } from "@/lib/signup/tokens";

import { consumeLink, issueLink, peekLink, restoreLink } from "./links";

const NOW = new Date("2026-11-26T10:00:00Z");

beforeEach(() => {
  calls.length = 0;
  result = { data: null, error: null };
});

describe("issueLink", () => {
  it("stores only the hash, for 30 minutes, replacing the user's previous link", async () => {
    const raw = await issueLink("u1", "password_change", NOW);
    expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(calls).toEqual([
      ["from", "account_action_tokens"],
      [
        "upsert",
        {
          user_id: "u1",
          purpose: "password_change",
          token_hash: hashToken(raw),
          expires_at: "2026-11-26T10:30:00.000Z",
        },
        { onConflict: "user_id,purpose" },
      ],
    ]);
    expect(JSON.stringify(calls)).not.toContain(raw);
  });

  it("throws on a database error", async () => {
    result = { error: { message: "down" } };
    await expect(issueLink("u1", "account_delete", NOW)).rejects.toThrow();
  });
});

describe("consumeLink", () => {
  it("is one delete filtered by hash, purpose and expiry", async () => {
    const expires = "2026-11-26T10:20:00+00:00";
    result = { data: [{ user_id: "u1", expires_at: expires }], error: null };
    expect(await consumeLink("raw", "account_delete", NOW)).toEqual({
      userId: "u1",
      expiresAt: expires,
    });
    expect(calls).toEqual([
      ["from", "account_action_tokens"],
      ["delete"],
      ["eq", "token_hash", hashToken("raw")],
      ["eq", "purpose", "account_delete"],
      ["gt", "expires_at", NOW.toISOString()],
      ["select", "user_id,expires_at"],
    ]);
  });

  it("returns null once the row is gone", async () => {
    result = { data: [], error: null };
    expect(await consumeLink("raw", "account_delete", NOW)).toBeNull();
  });

  it("throws on a database error", async () => {
    result = { error: { message: "down" } };
    await expect(consumeLink("raw", "account_delete", NOW)).rejects.toThrow();
  });
});

describe("peekLink", () => {
  it("reads without changing anything", async () => {
    result = {
      data: { user_id: "u1", purpose: "password_change" },
      error: null,
    };
    expect(await peekLink("raw", NOW)).toEqual({
      userId: "u1",
      purpose: "password_change",
    });
    const methods = calls.map(([m]) => m);
    expect(methods).not.toContain("delete");
    expect(methods).not.toContain("update");
    expect(methods).not.toContain("upsert");
    expect(calls).toContainEqual(["gt", "expires_at", NOW.toISOString()]);
  });

  it("returns null when nothing live matches", async () => {
    expect(await peekLink("raw", NOW)).toBeNull();
  });
});

describe("restoreLink", () => {
  const LINK = { userId: "u1", expiresAt: "2026-11-26T10:20:00+00:00" };

  it("puts the same link back without extending it", async () => {
    await restoreLink("raw", "password_change", LINK);
    expect(calls).toEqual([
      ["from", "account_action_tokens"],
      [
        "insert",
        {
          user_id: "u1",
          purpose: "password_change",
          token_hash: hashToken("raw"),
          expires_at: LINK.expiresAt,
        },
      ],
    ]);
  });

  it("leaves a newer link in place", async () => {
    result = { error: { code: "23505", message: "duplicate" } as never };
    await expect(
      restoreLink("raw", "password_change", LINK),
    ).resolves.toBeUndefined();
  });

  it("throws on another database error", async () => {
    result = { error: { message: "down" } };
    await expect(restoreLink("raw", "password_change", LINK)).rejects.toThrow();
  });
});
