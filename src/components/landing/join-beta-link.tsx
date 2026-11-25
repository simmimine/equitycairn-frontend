"use client";

import { cn } from "cn";

import { buttonVariants } from "@/components/ui/button";

export function JoinBetaLink() {
  return (
    <a
      href="#join"
      className={cn(
        buttonVariants(),
        "hidden h-[42px] min-w-[186px] rounded-[11px] font-semibold md:inline-flex",
      )}
      onClick={() => {
        const focus = () =>
          document.getElementById("hero-email")?.focus({ preventScroll: true });
        focus();
        // The browser's own jump to #join runs after this handler and takes
        // focus away again, so put it back.
        setTimeout(focus);
      }}
    >
      Join the beta
    </a>
  );
}
