import { createHash } from "node:crypto";

export function getClientKey(headers: Headers): string {
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return createHash("sha256")
    .update(first || "unknown")
    .digest("hex");
}
