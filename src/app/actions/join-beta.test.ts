import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn();
const from = vi.fn(() => ({ insert }));
const getSupabaseAdmin = vi.fn(() => ({ from }));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => getSupabaseAdmin(),
}));

import { HONEYPOT_FIELD } from "@/lib/signup/honeypot";

import { joinBeta } from "./join-beta";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("joinBeta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insert.mockResolvedValue({ error: null });
  });

  it("inserts a valid email and returns ok", async () => {
    const result = await joinBeta(null, form({ email: " Ann@Example.com " }));
    expect(from).toHaveBeenCalledWith("beta_signups");
    expect(insert).toHaveBeenCalledWith({
      email: "ann@example.com",
      source: "landing",
    });
    expect(result).toEqual({ ok: true });
  });

  it("treats a duplicate (23505) as success", async () => {
    insert.mockResolvedValue({ error: { code: "23505", message: "dup" } });
    expect(await joinBeta(null, form({ email: "ann@example.com" }))).toEqual({
      ok: true,
    });
  });

  it("returns server_error for other errors without logging the email", async () => {
    insert.mockResolvedValue({ error: { code: "XX000", message: "boom" } });
    const spies = (["log", "warn", "error", "info"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    const result = await joinBeta(null, form({ email: "ann@example.com" }));
    expect(result).toEqual({ ok: false, error: "server_error" });
    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain("ann@example.com");
      spy.mockRestore();
    }
  });

  it("rejects an invalid email without calling the client", async () => {
    const result = await joinBeta(null, form({ email: "nope" }));
    expect(result).toEqual({ ok: false, error: "invalid_email" });
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("silently succeeds when the honeypot is filled", async () => {
    const result = await joinBeta(
      null,
      form({ email: "ann@example.com", [HONEYPOT_FIELD]: "http://spam" }),
    );
    expect(result).toEqual({ ok: true });
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns server_error when the client cannot be created", async () => {
    getSupabaseAdmin.mockImplementationOnce(() => {
      throw new Error("missing env");
    });
    expect(await joinBeta(null, form({ email: "ann@example.com" }))).toEqual({
      ok: false,
      error: "server_error",
    });
  });

  it("logs the thrown error message but never the email", async () => {
    getSupabaseAdmin.mockImplementationOnce(() => {
      throw new Error("missing SUPABASE_URL");
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await joinBeta(null, form({ email: "ann@example.com" }));
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).toContain("missing SUPABASE_URL");
    expect(logged).not.toContain("ann@example.com");
    spy.mockRestore();
  });
});
