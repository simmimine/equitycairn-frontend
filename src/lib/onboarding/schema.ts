import { z } from "zod";

import { MAX_WATCHLIST } from "@/lib/auth/constants";

export const ROLES = [
  "retail_investor",
  "institutional_investor",
  "researcher_analyst",
  "financial_adviser",
  "other",
] as const;
export const EXPERIENCES = ["beginner", "intermediate", "experienced"] as const;

export type Role = (typeof ROLES)[number];
export type Experience = (typeof EXPERIENCES)[number];

/** Value and label pairs, in the order the forms show them. */
export const ROLE_OPTIONS = [
  ["retail_investor", "Retail investor"],
  ["institutional_investor", "Institutional investor"],
  ["researcher_analyst", "Researcher / analyst"],
  ["financial_adviser", "Financial adviser"],
  ["other", "Other"],
] as const satisfies readonly (readonly [Role, string])[];

export const EXPERIENCE_OPTIONS = [
  ["beginner", "Beginner"],
  ["intermediate", "Intermediate"],
  ["experienced", "Experienced"],
] as const satisfies readonly (readonly [Experience, string])[];

const nameSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[\p{L}][\p{L} '.-]*$/u);

export function parseName(
  first: unknown,
  last: unknown,
): { ok: true; first: string; last: string } | { ok: false } {
  const f = nameSchema.safeParse(first);
  const l = nameSchema.safeParse(last);
  return f.success && l.success
    ? { ok: true, first: f.data, last: l.data }
    : { ok: false };
}

function optionalEnum<T extends readonly string[]>(
  values: T,
  input: unknown,
): { ok: true; value: T[number] | null } | { ok: false } {
  if (
    input === undefined ||
    input === null ||
    input === "" ||
    input === "skip"
  ) {
    return { ok: true, value: null };
  }
  if (
    typeof input === "string" &&
    (values as readonly string[]).includes(input)
  ) {
    return { ok: true, value: input };
  }
  return { ok: false };
}

export function parseAbout(
  role: unknown,
  experience: unknown,
):
  | { ok: true; role: Role | null; experience: Experience | null }
  | { ok: false } {
  const r = optionalEnum(ROLES, role);
  const e = optionalEnum(EXPERIENCES, experience);
  return r.ok && e.ok
    ? { ok: true, role: r.value, experience: e.value }
    : { ok: false };
}

const TICKER = /^[A-Z.]{1,6}$/;

export function parseTickers(
  input: unknown,
):
  | { ok: true; tickers: string[] }
  | { ok: false; error: "invalid" | "too_many" } {
  if (typeof input !== "string") return { ok: false, error: "invalid" };
  const parts = input
    .split(/[\s,]+/)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);
  if (!parts.every((p) => TICKER.test(p)))
    return { ok: false, error: "invalid" };
  const tickers = [...new Set(parts)];
  if (tickers.length > MAX_WATCHLIST) return { ok: false, error: "too_many" };
  return { ok: true, tickers };
}
