import { cn } from "cn";
import Link from "next/link";

import { TEXT_LINK } from "@/components/brand/styles";
import { AuthCard, AuthNotice } from "@/components/join-beta/auth-card";
import { JoinBetaShell } from "@/components/join-beta/join-beta-shell";
import { LinkScreen } from "@/components/join-beta/link-screen";
import { ResendButton } from "@/components/join-beta/resend-button";

export function BetaCheckEmail({
  token,
  cooldownSeconds,
  resend,
}: {
  token: string;
  cooldownSeconds: number;
  resend?: React.ComponentProps<typeof ResendButton>["resend"];
}) {
  return (
    <JoinBetaShell>
      <AuthCard
        title="Check your email"
        description="We've sent you a link to confirm your address. It can take a minute to arrive, and may land in spam."
        icon="mail"
      >
        {/* No address here: the token in the URL must not reveal one. */}
        <AuthNotice>Confirmation email sent.</AuthNotice>
        <ResendButton
          token={token}
          initialCooldownSeconds={cooldownSeconds}
          resend={resend}
        />
        <p className="text-[11px] text-muted-foreground">
          If you don’t see it, check your spam folder.
        </p>
        <Link href="/" className={cn(TEXT_LINK, "mt-auto pt-4")}>
          Back to home
        </Link>
      </AuthCard>
    </JoinBetaShell>
  );
}

const CONFIRMED = "Your email address is confirmed.";

export function VerifyResultView({
  result,
}: {
  result: "verified" | "already_verified" | "invalid" | "error";
}) {
  switch (result) {
    case "verified":
      return (
        <LinkScreen
          title="You're on the list"
          description="Thanks for confirming your email. We'll be in touch about the beta."
          icon="check"
          notice={CONFIRMED}
          href="/"
          action="Back to home"
        />
      );
    case "already_verified":
      return (
        <LinkScreen
          title="Already verified"
          description="This email address is already confirmed. There's nothing more to do."
          icon="check"
          notice={CONFIRMED}
          href="/"
          action="Back to home"
        />
      );
    case "error":
      return (
        <LinkScreen
          title="Something went wrong"
          description="Please try the link again in a moment."
          href="/"
          action="Back to home"
        />
      );
    case "invalid":
      return (
        <LinkScreen
          title="This link is invalid or has expired"
          description="Sign up again and we'll send you a fresh link."
          href="/#join"
          action="Join the beta"
        />
      );
  }
}
