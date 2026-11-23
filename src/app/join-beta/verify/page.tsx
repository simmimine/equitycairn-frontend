import type { Metadata } from "next";
import { Suspense } from "react";

import { VerifyContent } from "./verify-content";
import { JoinBetaShell } from "@/components/join-beta/join-beta-shell";

export const metadata: Metadata = {
  title: "Confirm your email | EquityCairn",
  robots: { index: false, follow: false },
};

export default function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<JoinBetaShell>{null}</JoinBetaShell>}>
      <VerifyContent searchParams={searchParams} />
    </Suspense>
  );
}
