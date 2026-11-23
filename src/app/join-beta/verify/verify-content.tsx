import Link from "next/link";

import { JoinBetaShell } from "@/components/join-beta/join-beta-shell";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { parseTokenParam } from "@/lib/signup/search-token";
import { verifyEmail } from "@/lib/signup/store";

function Message({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <JoinBetaShell>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>{title}</h1>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={href} className={buttonVariants()}>
            {action}
          </Link>
        </CardContent>
      </Card>
    </JoinBetaShell>
  );
}

export async function VerifyContent({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const token = parseTokenParam((await searchParams).token);

  const invalid = (
    <Message
      title="This link is invalid or has expired"
      description="Sign up again and we'll send you a fresh link."
      href="/#join"
      action="Join the beta"
    />
  );
  if (!token) return invalid;

  let result;
  try {
    result = await verifyEmail(token);
  } catch {
    console.error("verify page: verification failed");
    return (
      <Message
        title="Something went wrong"
        description="Please try the link again in a moment."
        href="/"
        action="Back to home"
      />
    );
  }

  if (result === "verified") {
    return (
      <Message
        title="You're on the list"
        description="Thanks for confirming your email. We'll be in touch about the beta."
        href="/"
        action="Back to home"
      />
    );
  }
  if (result === "already_verified") {
    return (
      <Message
        title="Already verified"
        description="This email address is already confirmed. There's nothing more to do."
        href="/"
        action="Back to home"
      />
    );
  }
  return invalid;
}
