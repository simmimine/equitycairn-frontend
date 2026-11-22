import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());

export type ParseEmailResult = { ok: true; email: string } | { ok: false };

export function parseEmail(input: unknown): ParseEmailResult {
  const result = emailSchema.safeParse(input);
  return result.success ? { ok: true, email: result.data } : { ok: false };
}
