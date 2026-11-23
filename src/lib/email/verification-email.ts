const DEFAULT_FROM = "EquityCairn <onboarding@resend.dev>";
const DEFAULT_SITE_URL = "http://localhost:3000";

export async function sendVerificationEmail(
  to: string,
  rawVerifyToken: string,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Verification email not sent: RESEND_API_KEY is not set");
    return false;
  }

  const from = process.env.EMAIL_FROM || DEFAULT_FROM;
  const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(
    /\/+$/,
    "",
  );
  const link = `${siteUrl}/join-beta/verify?token=${encodeURIComponent(rawVerifyToken)}`;

  const text = [
    "EquityCairn",
    "",
    "Confirm your beta sign-up by opening this link:",
    link,
    "",
    "If you didn't sign up, ignore this email.",
  ].join("\n");
  const html = `<p><strong>EquityCairn</strong></p><p>Confirm your beta sign-up by opening this link:</p><p><a href="${link}">${link}</a></p><p>If you didn't sign up, ignore this email.</p>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Confirm your EquityCairn beta sign-up",
        text,
        html,
      }),
    });
    if (!res.ok) {
      console.error(
        `Verification email failed: Resend responded ${res.status}`,
      );
      return false;
    }
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error(`Verification email failed: ${message}`);
    return false;
  }
}
