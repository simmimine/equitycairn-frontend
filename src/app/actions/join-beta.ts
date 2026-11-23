"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { sendVerificationEmail } from "@/lib/email/verification-email";
import { getClientKey } from "@/lib/signup/client-key";
import { parseEmail } from "@/lib/signup/email";
import { HONEYPOT_FIELD } from "@/lib/signup/honeypot";
import { checkSignupRateLimit, registerSignup } from "@/lib/signup/store";
import type { JoinBetaResult } from "@/lib/signup/types";

export async function joinBeta(
  _prev: JoinBetaResult | null,
  formData: FormData,
): Promise<JoinBetaResult> {
  // Honeypot: bots fill the hidden honeypot field; pretend success.
  const honeypot = formData.get(HONEYPOT_FIELD);
  if (typeof honeypot === "string" && honeypot !== "") {
    return { ok: true };
  }

  const parsed = parseEmail(formData.get("email"));
  if (!parsed.ok) {
    return { ok: false, error: "invalid_email" };
  }

  let manageToken: string;
  try {
    const key = getClientKey(await headers());
    const limit = await checkSignupRateLimit(key);
    if (!limit.allowed) {
      return {
        ok: false,
        error: "rate_limited",
        retryAfterSeconds: limit.retryAfterSeconds,
      };
    }

    const registered = await registerSignup(parsed.email);
    manageToken = registered.manageToken;

    // Only send when a token was issued; the outcome never changes the
    // response, so existing and new addresses look identical.
    if (registered.verifyToken) {
      try {
        await sendVerificationEmail(parsed.email, registered.verifyToken);
      } catch {
        console.error("joinBeta verification email failed");
      }
    }
  } catch (err) {
    console.error(
      "joinBeta unexpected failure",
      err instanceof Error ? err.message : "unknown",
    );
    return { ok: false, error: "server_error" };
  }

  // Outside the try block: redirect() throws a control-flow error.
  redirect(`/join-beta?token=${encodeURIComponent(manageToken)}`);
}
