import type { Metadata } from "next";
import { Suspense } from "react";

import { JoinBetaContent } from "./join-beta-content";
import { JoinBetaShell } from "@/components/join-beta/join-beta-shell";

export const metadata: Metadata = {
  title: "Check your email | EquityCairn",
  robots: { index: false, follow: false },
};

export default function JoinBetaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<JoinBetaShell>{null}</JoinBetaShell>}>
      <JoinBetaContent searchParams={searchParams} />
    </Suspense>
  );
}
