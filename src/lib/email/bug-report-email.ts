import type { BugReport } from "@/lib/bugs/schema";

import { escapeHtml, sendEmail } from "./send";

export async function sendBugReportEmail(
  report: BugReport,
  reporter: { id: string; email: string },
): Promise<boolean> {
  const to = process.env.BUG_REPORT_EMAIL?.trim();
  if (!to) {
    console.error("Bug report not emailed: BUG_REPORT_EMAIL is not set");
    return false;
  }
  const lines = [
    "What happened:",
    report.whatHappened,
    "",
    "What was expected:",
    report.expected ?? "(not given)",
    "",
    `Page: ${report.pagePath ?? "(unknown)"}`,
    `Browser: ${report.browser ?? "(unknown)"}`,
    `Screen: ${report.screen ?? "(unknown)"}`,
    `From: ${reporter.email}`,
    `User id: ${reporter.id}`,
  ];
  const text = lines.join("\n");
  return sendEmail({
    to,
    subject: "EquityCairn bug report",
    text,
    html: `<pre style="white-space:pre-wrap">${escapeHtml(text)}</pre>`,
  });
}
