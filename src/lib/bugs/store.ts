import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

import type { BugReport } from "./schema";

/** Written with the service role: browsers have no access to the table. */
export async function insertBugReport(
  userId: string,
  report: BugReport,
): Promise<void> {
  const { error } = await getSupabaseAdmin().from("bug_reports").insert({
    user_id: userId,
    what_happened: report.whatHappened,
    expected: report.expected,
    page_path: report.pagePath,
    browser: report.browser,
    screen: report.screen,
  });
  if (error) throw new Error(`bug reports: insert: ${error.message}`);
}
