import { BetaCard } from "@/components/landing/beta-card";

export function FinalCta() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 py-6 md:px-8 lg:px-16">
      <BetaCard
        inputId="cta-email"
        data-testid="cta-card"
        className="mx-auto max-w-2xl"
      />
    </div>
  );
}
