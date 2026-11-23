"use server";

import { HONEYPOT_FIELD } from "@/lib/signup/honeypot";
import { parseEmail } from "@/lib/signup/email";
import type { JoinBetaResult } from "@/lib/signup/types";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const UNIQUE_VIOLATION = "23505";

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

  try {
    const { error } = await getSupabaseAdmin()
      .from("beta_signups")
      .insert({ email: parsed.email, source: "landing" });
    if (error && error.code !== UNIQUE_VIOLATION) {
      console.error("joinBeta insert failed", { code: error.code });
      return { ok: false, error: "server_error" };
    }
    return { ok: true };
  } catch (err) {
    console.error(
      "joinBeta unexpected failure",
      err instanceof Error ? err.message : "unknown",
    );
    return { ok: false, error: "server_error" };
  }
}
