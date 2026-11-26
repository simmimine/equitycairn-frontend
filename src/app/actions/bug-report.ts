"use server";

import { after } from "next/server";

import { checkAttempts } from "@/lib/auth/attempts";
import { ACCOUNT_LIMITS } from "@/lib/auth/constants";
import { getUser } from "@/lib/auth/session";
import { parseBugReport, type BugInput } from "@/lib/bugs/schema";
import { insertBugReport } from "@/lib/bugs/store";
import { sendBugReportEmail } from "@/lib/email/bug-report-email";

export type ReportBugResult =
  | { ok: true }
  | { ok: false; error: "unauthenticated" | "invalid" | "server_error" }
  | { ok: false; error: "rate_limited"; retryAfterSeconds: number };

export async function reportBugAction(
  input: BugInput,
): Promise<ReportBugResult> {
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "unauthenticated" };
    const parsed = parseBugReport(input);
    if (!parsed.ok) return { ok: false, error: "invalid" };
    const limit = await checkAttempts(
      "bug-report",
      user.id,
      ACCOUNT_LIMITS.bug,
    );
    if (!limit.allowed) {
      return {
        ok: false,
        error: "rate_limited",
        retryAfterSeconds: limit.retryAfterSeconds,
      };
    }
    // Saved first: a failed email must not lose the report.
    await insertBugReport(user.id, parsed.report);
    const reporter = { id: user.id, email: user.email ?? "" };
    after(async () => {
      try {
        await sendBugReportEmail(parsed.report, reporter);
      } catch {
        console.error("reportBug email failed");
      }
    });
    return { ok: true };
  } catch (err) {
    console.error(
      "reportBug failure",
      err instanceof Error ? err.message : "unknown",
    );
    return { ok: false, error: "server_error" };
  }
}
