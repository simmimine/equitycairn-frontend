import Link from "next/link";

import { JoinBetaShell } from "@/components/join-beta/join-beta-shell";
import { ConfirmForm } from "@/components/login/confirm-form";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <JoinBetaShell>
        <Card>
          <CardHeader>
            <CardTitle>
              <h1>This link isn&apos;t valid</h1>
            </CardTitle>
            <CardDescription>
              Create your account again and we&apos;ll send a fresh link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login" className={buttonVariants()}>
              Back to log in
            </Link>
          </CardContent>
        </Card>
      </JoinBetaShell>
    );
  }

  return (
    <JoinBetaShell>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Confirm your account</h1>
          </CardTitle>
          <CardDescription>
            One last step to make sure it&apos;s you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConfirmForm tokenHash={tokenHash} email={email} />
        </CardContent>
      </Card>
    </JoinBetaShell>
  );
}
