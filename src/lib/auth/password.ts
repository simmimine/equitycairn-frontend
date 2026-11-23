import { PASSWORD_MAX, PASSWORD_MIN } from "./constants";

export type PasswordResult =
  | { ok: true; password: string }
  | {
      ok: false;
      error: "too_short" | "too_long" | "mismatch" | "common" | "invalid";
    };

// Lowercased. Only entries that would otherwise pass the length rule matter.
const COMMON = new Set([
  "password1234",
  "password12345",
  "password123456",
  "passwordpassword",
  "123456789012",
  "1234567890123",
  "12345678901234",
  "qwertyuiop12",
  "qwertyuiopasdf",
  "qwerty123456",
  "qwertyuiop123",
  "iloveyou1234",
  "iloveyou12345",
  "letmein123456",
  "welcome12345",
  "welcome123456",
  "administrator",
  "changeme1234",
  "changeme12345",
  "abcdefghijkl",
  "abcd12345678",
  "1q2w3e4r5t6y",
  "1qaz2wsx3edc",
  "equitycairn",
  "equitycairn1",
  "equitycairn123",
]);

export function validatePassword(
  password: unknown,
  confirm: unknown,
): PasswordResult {
  if (typeof password !== "string" || typeof confirm !== "string") {
    return { ok: false, error: "invalid" };
  }
  if ([...password].length < PASSWORD_MIN) {
    return { ok: false, error: "too_short" };
  }
  // The limit is in bytes: bcrypt (used by Supabase Auth) ignores everything past 72 bytes.
  if (new TextEncoder().encode(password).length > PASSWORD_MAX) {
    return { ok: false, error: "too_long" };
  }
  if (password !== confirm) return { ok: false, error: "mismatch" };
  if (COMMON.has(password.toLowerCase())) {
    return { ok: false, error: "common" };
  }
  return { ok: true, password };
}
