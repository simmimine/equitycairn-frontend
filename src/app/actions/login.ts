"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";

import {
  createPendingAccount,
  getAccountState,
  signInWithPassword,
  signOutSession,
} from "@/lib/auth/accounts";
import { checkAttempts } from "@/lib/auth/attempts";
import { LOGIN_ATTEMPTS } from "@/lib/auth/constants";
import { validatePassword } from "@/lib/auth/password";
import type {
  CheckEmailResult,
  CreateAccountResult,
  ResendBetaResult,
  SignInResult,
} from "@/lib/auth/types";
import { sendConfirmEmail } from "@/lib/email/confirm-email";
import { sendVerificationEmail } from "@/lib/email/verification-email";
import { getClientKey } from "@/lib/signup/client-key";
import { COOLDOWN_SECONDS } from "@/lib/signup/constants";
import { parseEmail } from "@/lib/signup/email";
import {
  checkSignupRateLimit,
  getBetaStatus,
  issueVerifyByEmail,
} from "@/lib/signup/store";
import { hashToken } from "@/lib/signup/tokens";

function logFailure(context: string, err: unknown) {
  // Never log the address, password or tokens.
  console.error(context, err instanceof Error ? err.message : "unknown");
}

export async function checkEmail(email: string): Promise<CheckEmailResult> {
  const parsed = parseEmail(email);
  if (!parsed.ok) return { ok: false, error: "invalid_email" };
  try {
    const limit = await checkAttempts(
      "login-email",
      getClientKey(await headers()),
      LOGIN_ATTEMPTS.email,
    );
    if (!limit.allowed) {
      return {
        ok: false,
        error: "rate_limited",
        retryAfterSeconds: limit.retryAfterSeconds,
      };
    }
    const beta = await getBetaStatus(parsed.email);
    if (beta !== "verified") return { ok: true, state: beta };
    const account = await getAccountState(parsed.email);
    return {
      ok: true,
      state: account === "confirmed" ? "has_account" : "no_account",
    };
  } catch (err) {
    logFailure("checkEmail unexpected failure", err);
    return { ok: false, error: "server_error" };
  }
}

export async function resendBetaVerification(
  email: string,
): Promise<ResendBetaResult> {
  const parsed = parseEmail(email);
  if (!parsed.ok) return { ok: false, error: "invalid_email" };
  try {
    const limit = await checkAttempts(
      "login-email",
      getClientKey(await headers()),
      LOGIN_ATTEMPTS.email,
    );
    if (!limit.allowed) {
      return {
        ok: false,
        error: "rate_limited",
        retryAfterSeconds: limit.retryAfterSeconds,
      };
    }
    const result = await issueVerifyByEmail(parsed.email);
    if (result.status === "cooldown") {
      return {
        ok: false,
        error: "cooldown",
        retryAfterSeconds: result.retryAfterSeconds,
      };
    }
    if (result.status === "sent") {
      const { verifyToken } = result;
      after(async () => {
        try {
          await sendVerificationEmail(parsed.email, verifyToken);
        } catch {
          console.error("resendBetaVerification email failed");
        }
      });
    }
    return { ok: true, retryAfterSeconds: COOLDOWN_SECONDS };
  } catch (err) {
    logFailure("resendBetaVerification unexpected failure", err);
    return { ok: false, error: "server_error" };
  }
}

export async function createAccount(
  email: string,
  password: string,
  confirm: string,
): Promise<CreateAccountResult> {
  const parsed = parseEmail(email);
  if (!parsed.ok) return { ok: false, error: "invalid_email" };
  const pw = validatePassword(password, confirm);
  if (!pw.ok) return { ok: false, error: "password", passwordError: pw.error };

  try {
    const ipLimit = await checkAttempts(
      "login-email",
      getClientKey(await headers()),
      LOGIN_ATTEMPTS.email,
    );
    if (!ipLimit.allowed) {
      return {
        ok: false,
        error: "rate_limited",
        retryAfterSeconds: ipLimit.retryAfterSeconds,
      };
    }

    // Authoritative membership check: the card state is never trusted.
    if ((await getBetaStatus(parsed.email)) !== "verified") {
      return { ok: false, error: "not_member" };
    }

    const cooldown = await checkSignupRateLimit(
      `create:${hashToken(parsed.email)}`,
    );
    if (!cooldown.allowed) {
      return {
        ok: false,
        error: "cooldown",
        retryAfterSeconds: cooldown.retryAfterSeconds,
      };
    }

    const created = await createPendingAccount(parsed.email, pw.password);
    if ("error" in created) {
      return {
        ok: false,
        error:
          created.error === "exists_confirmed" ? "has_account" : "server_error",
      };
    }
    const { tokenHash } = created;
    after(async () => {
      try {
        await sendConfirmEmail(parsed.email, tokenHash);
      } catch {
        console.error("createAccount confirm email failed");
      }
    });
    return { ok: true, retryAfterSeconds: COOLDOWN_SECONDS };
  } catch (err) {
    logFailure("createAccount unexpected failure", err);
    return { ok: false, error: "server_error" };
  }
}

export async function signIn(
  email: string,
  password: string,
): Promise<SignInResult> {
  const parsed = parseEmail(email);
  if (!parsed.ok || typeof password !== "string" || password === "") {
    return { ok: false, error: "invalid_email" };
  }
  try {
    const limit = await checkAttempts(
      "login-pw",
      getClientKey(await headers()),
      LOGIN_ATTEMPTS.password,
    );
    if (!limit.allowed) {
      return {
        ok: false,
        error: "rate_limited",
        retryAfterSeconds: limit.retryAfterSeconds,
      };
    }
    const result = await signInWithPassword(parsed.email, password);
    if (result === "invalid")
      return { ok: false, error: "invalid_credentials" };
    if (result === "unconfirmed") return { ok: false, error: "unconfirmed" };
  } catch (err) {
    logFailure("signIn unexpected failure", err);
    return { ok: false, error: "server_error" };
  }
  // Outside the try block: redirect() throws a control-flow error.
  redirect("/feed");
}

export async function signOut(): Promise<void> {
  await signOutSession("local");
  redirect("/");
}

export async function signOutEverywhere(): Promise<void> {
  await signOutSession("global");
  redirect("/");
}
