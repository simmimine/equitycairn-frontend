import { ConfirmScreen } from "@/components/login/confirm-screen";
import { LinkScreen } from "@/components/join-beta/link-screen";
import { parseEmail } from "@/lib/signup/email";

type Params = { token_hash?: string | string[]; email?: string | string[] };

// Supabase token hashes are URL-safe; anything else cannot match a token.
function parseTokenHash(value: string | string[] | undefined): string | null {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(value)
    ? value
    : null;
}

// Rendering this page changes nothing: confirmation only happens when the form
// is submitted with the password, so link scanners that prefetch it do nothing.
export async function ConfirmContent({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const tokenHash = parseTokenHash(params.token_hash);
  const parsedEmail = parseEmail(params.email);
  const email = parsedEmail.ok ? parsedEmail.email : null;

  if (!tokenHash || !email) {
    return (
      <LinkScreen
        title="This link isn't valid"
        description="Create your account again and we'll send a fresh link."
        href="/login"
        action="Back to log in"
      />
    );
  }

  return <ConfirmScreen tokenHash={tokenHash} email={email} />;
}
