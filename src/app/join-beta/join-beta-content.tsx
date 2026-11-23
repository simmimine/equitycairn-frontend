import Link from "next/link";

import { JoinBetaShell } from "@/components/join-beta/join-beta-shell";
import { ResendButton } from "@/components/join-beta/resend-button";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { parseTokenParam } from "@/lib/signup/search-token";
import { getSignupStatus } from "@/lib/signup/store";

function HomeLink() {
  return (
    <Link href="/" className={buttonVariants()}>
      Back to home
    </Link>
  );
}

function Message({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
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
        {children && <CardContent>{children}</CardContent>}
      </Card>
    </JoinBetaShell>
  );
}

export async function JoinBetaContent({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const token = parseTokenParam((await searchParams).token);

  const invalid = (
    <Message
      title="This link isn't valid"
      description="Head back to the home page to join the beta."
    >
      <HomeLink />
    </Message>
  );
  if (!token) return invalid;

  let status;
  try {
    status = await getSignupStatus(token);
  } catch {
    console.error("join-beta page: status lookup failed");
    return (
      <Message
        title="Something went wrong"
        description="Please try again in a moment."
      >
        <HomeLink />
      </Message>
    );
  }
  if (!status) return invalid;

  return (
    <Message
      title="Check your email"
      description="We've sent you a link to confirm your address. It can take a minute to arrive, and may land in spam."
    >
      <ResendButton
        token={token}
        initialCooldownSeconds={status.cooldownRemainingSeconds}
      />
    </Message>
  );
}
