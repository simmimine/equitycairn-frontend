export type JoinBetaResult =
  | { ok: true }
  | { ok: false; error: "invalid_email" | "server_error" }
  | { ok: false; error: "rate_limited"; retryAfterSeconds: number };

export type ResendResult =
  | { ok: true; retryAfterSeconds: number }
  | { ok: false; error: "cooldown"; retryAfterSeconds: number }
  | { ok: false; error: "invalid_token" | "server_error" };
