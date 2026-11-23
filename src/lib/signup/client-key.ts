import { createHash } from "node:crypto";

function trustedHops(): number {
  const raw = process.env.TRUSTED_PROXY_HOPS?.trim();
  if (!raw || !/^\d+$/.test(raw)) return 1;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n >= 1 ? n : 1;
}

/**
 * Hashes the client address taken from the right of x-forwarded-for, since
 * entries added by our own proxies are trustworthy and the left side is
 * client-controlled.
 */
export function getClientKey(headers: Headers): string {
  const entries = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const index = Math.max(entries.length - trustedHops(), 0);
  return createHash("sha256")
    .update(entries[index] || "unknown")
    .digest("hex");
}
