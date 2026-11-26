import type { LinkPurpose } from "@/lib/account/links";
import { ACCOUNT_LINK_TTL_MINUTES } from "@/lib/auth/constants";

import { escapeHtml, getSiteUrl, sendEmail } from "./send";

const COPY: Record<LinkPurpose, { subject: string; intro: string }> = {
  password_change: {
    subject: "Change your EquityCairn password",
    intro: "Open this link to choose a new password:",
  },
  account_delete: {
    subject: "Confirm deleting your EquityCairn account",
    intro:
      "Open this link to delete your account. Nothing is deleted until you confirm on that page:",
  },
};

export async function sendAccountLinkEmail(
  to: string,
  purpose: LinkPurpose,
  rawToken: string,
): Promise<boolean> {
  const siteUrl = getSiteUrl();
  if (!siteUrl) return false;
  const link = `${siteUrl}/account/confirm?token=${encodeURIComponent(rawToken)}`;
  const safeLink = escapeHtml(link);
  const { subject, intro } = COPY[purpose];
  const expiry = `The link works once and lasts ${ACCOUNT_LINK_TTL_MINUTES} minutes.`;
  const ignore = "If you didn't ask for this, ignore this email.";

  return sendEmail({
    to,
    subject,
    text: ["EquityCairn", "", intro, link, "", expiry, ignore].join("\n"),
    html: `<p><strong>EquityCairn</strong></p><p>${intro}</p><p><a href="${safeLink}">${safeLink}</a></p><p>${expiry}</p><p>${escapeHtml(ignore).replace("&#39;", "'")}</p>`,
  });
}
