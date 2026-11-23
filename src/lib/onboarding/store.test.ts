import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = { table: string; method: string; args: unknown[] };
let calls: Call[] = [];
let results: Record<string, { data: unknown; error: unknown }> = {};

function chain(table: string) {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void) =>
            resolve(results[table] ?? { data: null, error: null });
        }
        return (...args: unknown[]) => {
          calls.push({ table, method: prop, args });
          return proxy;
        };
      },
    },
  );
  return proxy;
}

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({
  createSessionClient: async () => ({ from: (t: string) => chain(t) }),
}));

import {
  getProfile,
  markOnboarded,
  saveAbout,
  saveName,
  saveWatchlist,
} from "./store";

const UID = "user-1";

beforeEach(() => {
  calls = [];
  results = {};
});

describe("getProfile", () => {
  it("returns null when there is no profile row", async () => {
    results.profiles = { data: null, error: null };
    expect(await getProfile(UID)).toBeNull();
  });

  it("maps the profile and watchlist", async () => {
    results.profiles = {
      data: {
        first_name: "Ann",
        last_name: "Lee",
        role: "other",
        experience: null,
        onboarded_at: "2026-11-24T00:00:00Z",
      },
      error: null,
    };
    results.watchlist_items = {
      data: [{ ticker: "AAPL" }, { ticker: "MSFT" }],
      error: null,
    };
    expect(await getProfile(UID)).toEqual({
      firstName: "Ann",
      lastName: "Lee",
      role: "other",
      experience: null,
      onboardedAt: "2026-11-24T00:00:00Z",
      tickers: ["AAPL", "MSFT"],
    });
  });

  it("throws on a database error", async () => {
    results.profiles = { data: null, error: { message: "boom" } };
    await expect(getProfile(UID)).rejects.toThrow();
  });
});

describe("writes", () => {
  it("saveName upserts the profile row for the user", async () => {
    await saveName(UID, "Ann", "Lee");
    expect(calls).toContainEqual({
      table: "profiles",
      method: "upsert",
      args: [
        { user_id: UID, first_name: "Ann", last_name: "Lee" },
        { onConflict: "user_id" },
      ],
    });
  });

  it("saveAbout stores nulls for skipped answers", async () => {
    await saveAbout(UID, null, null);
    expect(calls).toContainEqual({
      table: "profiles",
      method: "update",
      args: [{ role: null, experience: null }],
    });
    expect(calls).toContainEqual({
      table: "profiles",
      method: "eq",
      args: ["user_id", UID],
    });
  });

  it("saveWatchlist removes dropped tickers before adding, so a full list can be swapped", async () => {
    await saveWatchlist(UID, ["AAPL", "MSFT"]);
    const methods = calls.filter((c) => c.table === "watchlist_items");
    expect(methods.map((c) => c.method).indexOf("delete")).toBeLessThan(
      methods.map((c) => c.method).indexOf("upsert"),
    );
    expect(methods).toContainEqual({
      table: "watchlist_items",
      method: "not",
      args: ["ticker", "in", "(AAPL,MSFT)"],
    });
    expect(methods).toContainEqual({
      table: "watchlist_items",
      method: "upsert",
      args: [
        [
          { user_id: UID, ticker: "AAPL" },
          { user_id: UID, ticker: "MSFT" },
        ],
        { onConflict: "user_id,ticker", ignoreDuplicates: true },
      ],
    });
  });

  it("saveWatchlist with no tickers only clears the list", async () => {
    await saveWatchlist(UID, []);
    const methods = calls.map((c) => c.method);
    expect(methods).not.toContain("upsert");
    expect(methods).toContain("delete");
    expect(methods).not.toContain("not");
  });

  it("markOnboarded sets onboarded_at for the user", async () => {
    await markOnboarded(UID);
    const update = calls.find((c) => c.method === "update");
    expect(update?.args[0]).toMatchObject({
      onboarded_at: expect.any(String),
    });
  });

  it("surfaces database errors", async () => {
    results.profiles = { data: null, error: { message: "denied" } };
    await expect(saveName(UID, "A", "B")).rejects.toThrow();
  });
});
