import { cn } from "cn";

import { CONTAINER } from "@/components/brand/styles";
import { BetaCard } from "@/components/landing/beta-card";

export function FinalCta() {
  return (
    <div className={cn(CONTAINER, "py-6")}>
      <BetaCard
        inputId="cta-email"
        data-testid="cta-card"
        className="mx-auto max-w-2xl"
      />
    </div>
  );
}
