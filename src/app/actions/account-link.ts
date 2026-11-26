"use server";

import { headers } from "next/headers";

import { deleteAccount, setPassword } from "@/lib/account/admin";
import { consumeLink, issueLink, type LinkPurpose } from "@/lib/account/links";
import { signOutSession } from "@/lib/auth/accounts";
import { checkAttempts } from "@/lib/auth/attempts";
import { ACCOUNT_LIMITS } from "@/lib/auth/constants";
import { validatePassword, type PasswordResult } from "@/lib/auth/password";
import { getUser } from "@/lib/auth/session";
import { sendAccountLinkEmail } from "@/lib/email/account-link-email";
import { getClientKey } from "@/lib/signup/client-key";

type RateLimited = {
  ok: false;
  error: "rate_limited";
  retryAfterSeconds: number;
};

export type RequestLinkResult =
  | { ok: true; email: string }
  | {
      ok: false;
      error: "unauthenticated" | "invalid" | "send_failed" | "server_error";
    }
  | RateLimited;

export type ConfirmResult =
  | { ok: true }
  | { ok: false; error: "expired" | "server_error" }
  | {
      ok: false;
      error: "password";
      passwordError: Extract<PasswordResult, { ok: false }>["error"];
    }
  | RateLimited;

function logFailure(context: string, err: unknown) {
  console.error(context, err instanceof Error ? err.message : "unknown");
}

/** Emails the signed-in user a link that confirms a password change or deletion. */
export async function requestAccountLink(
  purpose: LinkPurpose,
): Promise<RequestLinkResult> {
  if (purpose !== "password_change" && purpose !== "account_delete") {
    return { ok: false, error: "invalid" };
  }
  try {
    const user = await getUser();
    // Only ever the session's own address: never one the caller supplies.
    if (!user?.email) return { ok: false, error: "unauthenticated" };
    const limit = await checkAttempts(
      "account-link",
      user.id,
      ACCOUNT_LIMITS.link,
    );
    if (!limit.allowed) {
      return {
        ok: false,
        error: "rate_limited",
        retryAfterSeconds: limit.retryAfterSeconds,
      };
    }
    const token = await issueLink(user.id, purpose);
    if (!(await sendAccountLinkEmail(user.email, purpose, token))) {
      return { ok: false, error: "send_failed" };
    }
    return { ok: true, email: user.email };
  } catch (err) {
    logFailure("requestAccountLink failure", err);
    return { ok: false, error: "server_error" };
  }
}

/**
 * Uses a link up and acts on its account. The link alone is the authority, so this
 * works signed out or on another device.
 */
async function confirmLink(
  token: unknown,
  purpose: LinkPurpose,
  act: (userId: string) => Promise<void>,
): Promise<ConfirmResult> {
  if (typeof token !== "string" || token === "") {
    return { ok: false, error: "expired" };
  }
  try {
    const limit = await checkAttempts(
      "account-confirm",
      getClientKey(await headers()),
      ACCOUNT_LIMITS.confirm,
    );
    if (!limit.allowed) {
      return {
        ok: false,
        error: "rate_limited",
        retryAfterSeconds: limit.retryAfterSeconds,
      };
    }
    // Read before acting: afterwards this session no longer validates.
    const current = await getUser();
    const link = await consumeLink(token, purpose);
    if (!link) return { ok: false, error: "expired" };
    await act(link.userId);
    // Only the link's own account: another user of this browser stays signed in.
    if (current?.id === link.userId) {
      try {
        await signOutSession("local");
      } catch (err) {
        logFailure("confirm link sign out failure", err);
      }
    }
    return { ok: true };
  } catch (err) {
    logFailure("confirm link failure", err);
    return { ok: false, error: "server_error" };
  }
}

export async function confirmPasswordChange(
  token: string,
  password: string,
  confirm: string,
): Promise<ConfirmResult> {
  // Validated first, so a typo does not use the link up.
  const checked = validatePassword(password, confirm);
  if (!checked.ok) {
    return { ok: false, error: "password", passwordError: checked.error };
  }
  return confirmLink(token, "password_change", (userId) =>
    setPassword(userId, checked.password),
  );
}

export async function confirmAccountDeletion(
  token: string,
): Promise<ConfirmResult> {
  return confirmLink(token, "account_delete", deleteAccount);
}
