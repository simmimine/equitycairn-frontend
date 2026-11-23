"use server";

import { headers } from "next/headers";
import { after } from "next/server";

import { sendVerificationEmail } from "@/lib/email/verification-email";
import { COOLDOWN_SECONDS } from "@/lib/signup/constants";
import { getClientKey } from "@/lib/signup/client-key";
import { parseTokenParam } from "@/lib/signup/search-token";
import { checkSignupRateLimit, issueResend } from "@/lib/signup/store";
import type { ResendResult } from "@/lib/signup/types";

export async function resendVerification(token: string): Promise<ResendResult> {
  const manageToken = parseTokenParam(token);
  if (!manageToken) {
    return { ok: false, error: "invalid_token" };
  }

  try {
    // Per-IP limit, in its own keyspace so it never shares the sign-up budget.
    const key = `resend:${getClientKey(await headers())}`;
    const limit = await checkSignupRateLimit(key);
    if (!limit.allowed) {
      return {
        ok: false,
        error: "cooldown",
        retryAfterSeconds: limit.retryAfterSeconds,
      };
    }

    const result = await issueResend(manageToken);
    if (result.status === "invalid") {
      return { ok: false, error: "invalid_token" };
    }
    if (result.status === "cooldown") {
      return {
        ok: false,
        error: "cooldown",
        retryAfterSeconds: result.retryAfterSeconds,
      };
    }
    if (result.status === "sent") {
      const { email, verifyToken } = result;
      after(async () => {
        try {
          await sendVerificationEmail(email, verifyToken);
        } catch {
          console.error("resendVerification email failed");
        }
      });
    }
    // `sent` and `noop` are indistinguishable to the caller.
    return { ok: true, retryAfterSeconds: COOLDOWN_SECONDS };
  } catch (err) {
    console.error(
      "resendVerification unexpected failure",
      err instanceof Error ? err.message : "unknown",
    );
    return { ok: false, error: "server_error" };
  }
}
