import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FakeDb } from "./store.test-helpers";

const db = new FakeDb();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => db,
}));

import { COOLDOWN_SECONDS, VERIFY_TTL_HOURS } from "./constants";
import {
  checkSignupRateLimit,
  getSignupStatus,
  issueResend,
  registerSignup,
  verifyEmail,
} from "./store";
import { hashToken } from "./tokens";

const T0 = new Date("2026-11-23T10:00:00.000Z");

function advance(seconds: number) {
  vi.setSystemTime(new Date(Date.now() + seconds * 1000));
}

beforeEach(() => {
  db.rows = [];
  db.rpcCalls = [];
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkSignupRateLimit", () => {
  it("maps 0 to allowed and passes key and window", async () => {
    db.rpcImpl = () => 0;
    expect(await checkSignupRateLimit("k")).toEqual({ allowed: true });
    expect(db.rpcCalls).toEqual([
      {
        fn: "check_signup_rate_limit",
        args: { p_key: "k", p_window_seconds: COOLDOWN_SECONDS },
      },
    ]);
  });

  it("maps a positive number to retryAfterSeconds", async () => {
    db.rpcImpl = () => 37;
    expect(await checkSignupRateLimit("k")).toEqual({
      allowed: false,
      retryAfterSeconds: 37,
    });
  });

  it("throws on a non-numeric result", async () => {
    db.rpcImpl = () => null;
    await expect(checkSignupRateLimit("k")).rejects.toThrow();
  });
});

describe("registerSignup", () => {
  it("returns both tokens for a new address and stores only hashes", async () => {
    const r = await registerSignup("ann@example.com");
    expect(r.verifyToken).toEqual(expect.any(String));
    expect(db.rows).toHaveLength(1);
    const row = db.rows[0];
    expect(row.email).toBe("ann@example.com");
    expect(row.source).toBe("landing");
    expect(row.manage_token_hash).toBe(hashToken(r.manageToken));
    expect(row.verify_token_hash).toBe(hashToken(r.verifyToken!));
    expect(row.last_email_sent_at).toBe(T0.toISOString());
    expect(row.verify_expires_at).toBe(
      new Date(T0.getTime() + VERIFY_TTL_HOURS * 3600_000).toISOString(),
    );
    const stored = JSON.stringify(db.rows);
    expect(stored).not.toContain(r.manageToken);
    expect(stored).not.toContain(r.verifyToken!);
  });

  it("within cooldown returns a new manage token and no verify token", async () => {
    const first = await registerSignup("ann@example.com");
    advance(COOLDOWN_SECONDS - 1);
    const second = await registerSignup("ann@example.com");
    expect(second.verifyToken).toBeNull();
    expect(second.manageToken).not.toBe(first.manageToken);
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].manage_token_hash).toBe(hashToken(second.manageToken));
    expect(db.rows[0].verify_token_hash).toBe(hashToken(first.verifyToken!));
    expect(await getSignupStatus(first.manageToken)).toBeNull();
    expect(await getSignupStatus(second.manageToken)).not.toBeNull();
  });

  it("after the cooldown issues a fresh verify token", async () => {
    const first = await registerSignup("ann@example.com");
    advance(COOLDOWN_SECONDS);
    const second = await registerSignup("ann@example.com");
    expect(second.verifyToken).toEqual(expect.any(String));
    expect(second.verifyToken).not.toBe(first.verifyToken);
    expect(db.rows[0].verify_token_hash).toBe(hashToken(second.verifyToken!));
    expect(db.rows[0].last_email_sent_at).toBe(new Date().toISOString());
    expect(JSON.stringify(db.rows)).not.toContain(second.verifyToken!);
  });

  it("returns no verify token for a verified address", async () => {
    const first = await registerSignup("ann@example.com");
    await verifyEmail(first.verifyToken!);
    advance(COOLDOWN_SECONDS * 10);
    const again = await registerSignup("ann@example.com");
    expect(again.verifyToken).toBeNull();
    expect(again.manageToken).toEqual(expect.any(String));
    expect(db.rows[0].verify_token_hash).toBe(hashToken(first.verifyToken!));
  });

  it("finds the same row for an address differing only in case", async () => {
    await registerSignup("ann@example.com");
    advance(COOLDOWN_SECONDS);
    const r = await registerSignup("ANN@Example.com");
    expect(db.rows).toHaveLength(1);
    expect(r.verifyToken).toEqual(expect.any(String));
    expect(db.rows[0].manage_token_hash).toBe(hashToken(r.manageToken));
  });

  it("finds the same row despite surrounding whitespace", async () => {
    await registerSignup("ann@example.com");
    advance(COOLDOWN_SECONDS);
    const r = await registerSignup("  Ann@example.com ");
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].manage_token_hash).toBe(hashToken(r.manageToken));
  });

  it("bumps last_email_sent_at for a verified row after the cooldown without a verify token", async () => {
    const first = await registerSignup("ann@example.com");
    await verifyEmail(first.verifyToken!);
    const stored = db.rows[0].verify_token_hash;
    advance(COOLDOWN_SECONDS - 1);
    await registerSignup("ann@example.com");
    expect(db.rows[0].last_email_sent_at).toBe(T0.toISOString());
    advance(1);
    const again = await registerSignup("ann@example.com");
    expect(again.verifyToken).toBeNull();
    expect(db.rows[0].last_email_sent_at).toBe(new Date().toISOString());
    expect(db.rows[0].verify_token_hash).toBe(stored);
  });

  it("concurrent double signups yield a single verify token", async () => {
    await registerSignup("ann@example.com");
    advance(COOLDOWN_SECONDS);
    const [a, b] = await Promise.all([
      registerSignup("ann@example.com"),
      registerSignup("ann@example.com"),
    ]);
    const tokens = [a.verifyToken, b.verifyToken].filter(Boolean);
    expect(tokens).toHaveLength(1);
  });

  it("concurrent first-time signups yield a single verify token", async () => {
    const [a, b] = await Promise.all([
      registerSignup("new@example.com"),
      registerSignup("new@example.com"),
    ]);
    expect([a.verifyToken, b.verifyToken].filter(Boolean)).toHaveLength(1);
    expect(db.rows).toHaveLength(1);
  });
});

describe("getSignupStatus", () => {
  it("is null for unknown tokens and for a verify token", async () => {
    const r = await registerSignup("ann@example.com");
    expect(await getSignupStatus("nope")).toBeNull();
    expect(await getSignupStatus(r.verifyToken!)).toBeNull();
  });

  it("reports remaining cooldown seconds, rounded up", async () => {
    const r = await registerSignup("ann@example.com");
    expect(await getSignupStatus(r.manageToken)).toEqual({
      cooldownRemainingSeconds: COOLDOWN_SECONDS,
    });
    vi.setSystemTime(new Date(T0.getTime() + 30_500));
    expect(await getSignupStatus(r.manageToken)).toEqual({
      cooldownRemainingSeconds: 30,
    });
  });

  it("is 0 once the cooldown has passed", async () => {
    const r = await registerSignup("ann@example.com");
    advance(COOLDOWN_SECONDS);
    expect(await getSignupStatus(r.manageToken)).toEqual({
      cooldownRemainingSeconds: 0,
    });
  });

  it("caps the remaining seconds when last_email_sent_at is in the future", async () => {
    const r = await registerSignup("ann@example.com");
    db.rows[0].last_email_sent_at = new Date(
      T0.getTime() + 3600_000,
    ).toISOString();
    expect(await getSignupStatus(r.manageToken)).toEqual({
      cooldownRemainingSeconds: COOLDOWN_SECONDS,
    });
  });
});

describe("issueResend", () => {
  it("is invalid for unknown and verify tokens", async () => {
    const r = await registerSignup("ann@example.com");
    expect(await issueResend("nope")).toEqual({ status: "invalid" });
    expect(await issueResend(r.verifyToken!)).toEqual({ status: "invalid" });
  });

  it("reports cooldown with remaining seconds", async () => {
    const r = await registerSignup("ann@example.com");
    advance(20);
    expect(await issueResend(r.manageToken)).toEqual({
      status: "cooldown",
      retryAfterSeconds: COOLDOWN_SECONDS - 20,
    });
    expect(db.rows[0].verify_token_hash).toBe(hashToken(r.verifyToken!));
  });

  it("sends a rotated verify token after the cooldown", async () => {
    const r = await registerSignup("ann@example.com");
    advance(COOLDOWN_SECONDS);
    const res = await issueResend(r.manageToken);
    expect(res.status).toBe("sent");
    if (res.status !== "sent") throw new Error("unreachable");
    expect(res.verifyToken).not.toBe(r.verifyToken);
    expect(db.rows[0].verify_token_hash).toBe(hashToken(res.verifyToken));
    expect(db.rows[0].last_email_sent_at).toBe(new Date().toISOString());
    expect(JSON.stringify(db.rows)).not.toContain(res.verifyToken);
    // The old verify token no longer works; the new one does.
    expect(await verifyEmail(r.verifyToken!)).toBe("invalid");
    expect(await verifyEmail(res.verifyToken)).toBe("verified");
  });

  it("is a noop for a verified row", async () => {
    const r = await registerSignup("ann@example.com");
    await verifyEmail(r.verifyToken!);
    advance(COOLDOWN_SECONDS * 10);
    expect(await issueResend(r.manageToken)).toEqual({ status: "noop" });
  });

  it("concurrent resends yield a single sent", async () => {
    const r = await registerSignup("ann@example.com");
    advance(COOLDOWN_SECONDS);
    const results = await Promise.all([
      issueResend(r.manageToken),
      issueResend(r.manageToken),
    ]);
    expect(results.filter((x) => x.status === "sent")).toHaveLength(1);
    expect(results.filter((x) => x.status === "cooldown")).toHaveLength(1);
  });
});

describe("verifyEmail", () => {
  it("verifies, then reports already_verified on a second call", async () => {
    const r = await registerSignup("ann@example.com");
    expect(await verifyEmail(r.verifyToken!)).toBe("verified");
    expect(db.rows[0].verified_at).toBe(T0.toISOString());
    expect(await verifyEmail(r.verifyToken!)).toBe("already_verified");
  });

  it("reports already_verified even after expiry", async () => {
    const r = await registerSignup("ann@example.com");
    await verifyEmail(r.verifyToken!);
    advance((VERIFY_TTL_HOURS + 1) * 3600);
    expect(await verifyEmail(r.verifyToken!)).toBe("already_verified");
  });

  it("is invalid when expired and leaves the row unverified", async () => {
    const r = await registerSignup("ann@example.com");
    advance((VERIFY_TTL_HOURS + 1) * 3600);
    expect(await verifyEmail(r.verifyToken!)).toBe("invalid");
    expect(db.rows[0].verified_at).toBeNull();
  });

  it("is invalid for unknown tokens", async () => {
    await registerSignup("ann@example.com");
    expect(await verifyEmail("nope")).toBe("invalid");
  });

  it("is invalid for a manage token", async () => {
    const r = await registerSignup("ann@example.com");
    expect(await verifyEmail(r.manageToken)).toBe("invalid");
    expect(db.rows[0].verified_at).toBeNull();
  });
});

describe("verified/unverified timing parity", () => {
  async function pair() {
    const u = await registerSignup("unverified@example.com");
    const v = await registerSignup("verified@example.com");
    await verifyEmail(v.verifyToken!);
    return { u, v };
  }

  it("reports the same cooldown in status at every stage", async () => {
    const { u, v } = await pair();
    for (const step of [0, 20, 39, 1, 5]) {
      advance(step);
      expect(await getSignupStatus(v.manageToken)).toEqual(
        await getSignupStatus(u.manageToken),
      );
    }
  });

  it("resend: same cooldown class and seconds, success after cooldown", async () => {
    const { u, v } = await pair();
    expect(await issueResend(v.manageToken)).toEqual(
      await issueResend(u.manageToken),
    );
    advance(25);
    const uc = await issueResend(u.manageToken);
    expect(uc).toEqual({ status: "cooldown", retryAfterSeconds: 35 });
    expect(await issueResend(v.manageToken)).toEqual(uc);
    advance(35);
    expect((await issueResend(u.manageToken)).status).toBe("sent");
    expect(await issueResend(v.manageToken)).toEqual({ status: "noop" });
    // A verified resend restarts the cooldown just like a sent one.
    expect(await getSignupStatus(v.manageToken)).toEqual(
      await getSignupStatus(u.manageToken),
    );
    expect(await issueResend(v.manageToken)).toEqual(
      await issueResend(u.manageToken),
    );
  });

  it("repeat registerSignup gives the same status for both", async () => {
    const { u, v } = await pair();
    advance(COOLDOWN_SECONDS);
    const u2 = await registerSignup("unverified@example.com");
    const v2 = await registerSignup("verified@example.com");
    expect(u2.verifyToken).not.toBeNull();
    expect(v2.verifyToken).toBeNull();
    expect(await getSignupStatus(v2.manageToken)).toEqual(
      await getSignupStatus(u2.manageToken),
    );
    expect(u.manageToken).not.toBe(u2.manageToken);
    expect(v.manageToken).not.toBe(v2.manageToken);
  });
});
