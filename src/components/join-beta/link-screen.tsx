import { cn } from "cn";
import Link from "next/link";

import { AuthCard, AuthNotice } from "@/components/join-beta/auth-card";
import { JoinBetaShell } from "@/components/join-beta/join-beta-shell";
import { buttonVariants } from "@/components/ui/button";

/** A whole screen that says one thing and offers one way on. */
export function LinkScreen({
  title,
  description,
  href,
  action,
  icon,
  notice,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
  icon?: "check";
  notice?: string;
}) {
  return (
    <JoinBetaShell>
      <AuthCard title={title} description={description} icon={icon}>
        {notice && <AuthNotice>{notice}</AuthNotice>}
        <Link href={href} className={cn(buttonVariants({ size: "xl" }))}>
          {action}
        </Link>
      </AuthCard>
    </JoinBetaShell>
  );
}
