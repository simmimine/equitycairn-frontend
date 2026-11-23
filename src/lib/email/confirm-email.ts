import { escapeHtml, getSiteUrl, sendEmail } from "./send";

export async function sendConfirmEmail(
  to: string,
  tokenHash: string,
): Promise<boolean> {
  const siteUrl = getSiteUrl();
  if (!siteUrl) return false;
  const link = `${siteUrl}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&email=${encodeURIComponent(to)}`;
  const safeLink = escapeHtml(link);

  const text = [
    "EquityCairn",
    "",
    "Finish creating your account by opening this link. You'll be asked for the password you chose:",
    link,
    "",
    "If you didn't try to create an account, ignore this email.",
  ].join("\n");
  const html = `<p><strong>EquityCairn</strong></p><p>Finish creating your account by opening this link. You'll be asked for the password you chose:</p><p><a href="${safeLink}">${safeLink}</a></p><p>If you didn't try to create an account, ignore this email.</p>`;

  return sendEmail({
    to,
    subject: "Confirm your EquityCairn account",
    text,
    html,
  });
}
