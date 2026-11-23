import type { PasswordResult } from "./password";

export type CheckEmailResult =
  | {
      ok: true;
      state: "not_listed" | "unverified" | "no_account" | "has_account";
    }
  | { ok: false; error: "invalid_email" | "server_error" }
  | { ok: false; error: "rate_limited"; retryAfterSeconds: number };

export type ResendBetaResult =
  | { ok: true; retryAfterSeconds: number }
  | {
      ok: false;
      error: "cooldown" | "rate_limited";
      retryAfterSeconds: number;
    }
  | { ok: false; error: "invalid_email" | "server_error" };

export type PasswordError = Extract<PasswordResult, { ok: false }>["error"];

export type CreateAccountResult =
  | { ok: true; retryAfterSeconds: number }
  | { ok: false; error: "password"; passwordError: PasswordError }
  | {
      ok: false;
      error: "cooldown" | "rate_limited";
      retryAfterSeconds: number;
    }
  | {
      ok: false;
      error: "not_member" | "has_account" | "invalid_email" | "server_error";
    };

export type SignInResult =
  | {
      ok: false;
      error:
        | "invalid_credentials"
        | "unconfirmed"
        | "invalid_email"
        | "server_error";
    }
  | { ok: false; error: "rate_limited"; retryAfterSeconds: number };
