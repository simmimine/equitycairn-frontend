import type { Metadata } from "next";
import { Suspense } from "react";

import { SettingsContent } from "./settings-content";

export const metadata: Metadata = {
  title: "Settings | EquityCairn",
  robots: { index: false, follow: false },
};

export default function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  return (
    <Suspense
      fallback={
        <p role="status" className="sr-only">
          Loading…
        </p>
      }
    >
      <SettingsContent searchParams={searchParams} />
    </Suspense>
  );
}
