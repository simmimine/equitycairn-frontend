import type { Metadata } from "next";
import { Suspense } from "react";

import { FeedContent } from "./feed-content";

export const metadata: Metadata = {
  title: "Your feed | EquityCairn",
  robots: { index: false, follow: false },
};

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="sr-only">
          Loading…
        </p>
      }
    >
      <FeedContent />
    </Suspense>
  );
}
