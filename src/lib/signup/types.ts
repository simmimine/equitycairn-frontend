export type JoinBetaResult =
  { ok: true } | { ok: false; error: "invalid_email" | "server_error" };
