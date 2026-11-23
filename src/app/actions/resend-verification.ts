"use server";

import { sendVerificationEmail } from "@/lib/email/verification-email";
import { COOLDOWN_SECONDS } from "@/lib/signup/constants";
import { issueResend } from "@/lib/signup/store";
import type { ResendResult } from "@/lib/signup/types";

export async function resendVerification(token: string): Promise<ResendResult> {
  if (typeof token !== "string" || token === "") {
    return { ok: false, error: "invalid_token" };
  }

  try {
    const result = await issueResend(token);
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
      try {
        await sendVerificationEmail(result.email, result.verifyToken);
      } catch {
        console.error("resendVerification email failed");
      }
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
