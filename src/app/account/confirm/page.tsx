import type { Metadata } from "next";
import { Suspense } from "react";

import { JoinBetaShell } from "@/components/join-beta/join-beta-shell";

import { ConfirmContent } from "./confirm-content";

export const metadata: Metadata = {
  title: "Confirm it's you | EquityCairn",
  robots: { index: false, follow: false },
  // Keeps the token out of referrers. Not "no-referrer": that sends
  // `Origin: null`, which Next refuses for the server action.
  referrer: "strict-origin",
};

export default function AccountConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
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
