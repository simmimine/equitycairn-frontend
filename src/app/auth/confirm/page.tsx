import type { Metadata } from "next";
import { Suspense } from "react";

import { ConfirmContent } from "./confirm-content";
import { JoinBetaShell } from "@/components/join-beta/join-beta-shell";

export const metadata: Metadata = {
  title: "Confirm your account | EquityCairn",
  robots: { index: false, follow: false },
};

export default function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string | string[];
    email?: string | string[];
  }>;
}) {
  return (
    <Suspense
      fallback={
        <JoinBetaShell>
          <p role="status" className="sr-only">
            Loading…
          </p>
        </JoinBetaShell>
      }
    >
      <ConfirmContent searchParams={searchParams} />
    </Suspense>
  );
}
