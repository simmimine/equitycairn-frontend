"use client";

import { buttonVariants } from "@/components/ui/button";

export function JoinBetaLink() {
  return (
    <a
      href="#join"
      className={buttonVariants()}
      onClick={() => {
        document.getElementById("hero-email")?.focus({ preventScroll: true });
      }}
    >
      Join the beta
    </a>
  );
}
