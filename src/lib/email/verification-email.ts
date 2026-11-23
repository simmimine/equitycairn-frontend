import { escapeHtml, getSiteUrl, sendEmail } from "./send";

export async function sendVerificationEmail(
  to: string,
  rawVerifyToken: string,
): Promise<boolean> {
  const siteUrl = getSiteUrl();
  if (!siteUrl) return false;
  const link = `${siteUrl}/join-beta/verify?token=${encodeURIComponent(rawVerifyToken)}`;
  const safeLink = escapeHtml(link);

  const text = [
    "EquityCairn",
    "",
    "Confirm your beta sign-up by opening this link:",
    link,
    "",
    "If you didn't sign up, ignore this email.",
  ].join("\n");
  const html = `<p><strong>EquityCairn</strong></p><p>Confirm your beta sign-up by opening this link:</p><p><a href="${safeLink}">${safeLink}</a></p><p>If you didn't sign up, ignore this email.</p>`;

  return sendEmail({
    to,
    subject: "Confirm your EquityCairn beta sign-up",
    text,
    html,
  });
}
