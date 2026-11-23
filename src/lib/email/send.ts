const DEFAULT_FROM = "EquityCairn <onboarding@resend.dev>";
const DEFAULT_SITE_URL = "http://localhost:3000";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Base URL for links in emails, or null (and a log) when production lacks SITE_URL. */
export function getSiteUrl(): string | null {
  const configured = process.env.SITE_URL?.trim();
  if (!configured && process.env.NODE_ENV === "production") {
    console.error("SITE_URL is not set");
    return null;
  }
  return (configured || DEFAULT_SITE_URL).replace(/\/+$/, "");
}

/** Sends through Resend. Never logs the address, body or key. */
export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Email not sent: RESEND_API_KEY is not set");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(5000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!res.ok) {
      console.error(`Email failed: Resend responded ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    const raw = (err as { message?: unknown } | null)?.message;
    const message = typeof raw === "string" ? raw : "unknown error";
    console.error(`Email failed: ${message}`);
    return false;
  }
}
