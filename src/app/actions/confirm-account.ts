"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { confirmWithToken, passwordMatchesPending } from "@/lib/auth/accounts";
import { checkAttempts } from "@/lib/auth/attempts";
import { LOGIN_ATTEMPTS } from "@/lib/auth/constants";
import { getClientKey } from "@/lib/signup/client-key";
import { parseEmail } from "@/lib/signup/email";

export type ConfirmAccountResult =
  | { ok: false; error: "wrong_password" | "expired" | "server_error" }
  | { ok: false; error: "rate_limited"; retryAfterSeconds: number };

/**
 * Confirms a pending account. Needs BOTH the emailed token and the password
 * chosen at sign-up, so someone who pre-registered a member's address with a
 * password they know cannot get it confirmed by the member clicking the link.
 */
export async function confirmAccount(
  tokenHash: string,
  email: string,
  password: string,
): Promise<ConfirmAccountResult> {
  const parsed = parseEmail(email);
  if (
    !parsed.ok ||
    typeof tokenHash !== "string" ||
    tokenHash === "" ||
    typeof password !== "string" ||
    password === ""
  ) {
    return { ok: false, error: "expired" };
  }
  try {
    const limit = await checkAttempts(
      "confirm",
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
    if (!(await passwordMatchesPending(parsed.email, password))) {
      return { ok: false, error: "wrong_password" };
    }
    if (!(await confirmWithToken(tokenHash))) {
      return { ok: false, error: "expired" };
    }
  } catch (err) {
    console.error(
      "confirmAccount unexpected failure",
      err instanceof Error ? err.message : "unknown",
    );
    return { ok: false, error: "server_error" };
  }
  // Outside the try block: redirect() throws a control-flow error.
  redirect("/onboarding");
}
