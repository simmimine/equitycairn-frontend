// Tokens are 32 random bytes, base64url-encoded (43 chars). Anything else
// cannot match a row, so reject it before touching the database.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const MAX_TOKEN_LENGTH = 128;

export function parseTokenParam(
  value: string | string[] | undefined,
): string | null {
  if (typeof value !== "string") return null;
  if (value === "" || value.length > MAX_TOKEN_LENGTH) return null;
  return TOKEN_PATTERN.test(value) ? value : null;
}
