import { SignupForm } from "@/components/signup-form";

export function FinalCta() {
  return (
    <section aria-labelledby="final-cta" className="border-t">
      <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-16 sm:px-6 md:py-24">
        <div className="flex flex-col gap-2 text-center">
          <h2
            id="final-cta"
            className="text-2xl font-semibold tracking-tight md:text-3xl"
          >
            Join the beta
          </h2>
          <p className="text-muted-foreground">
            Be among the first to try a calmer way to follow your watchlist.
          </p>
        </div>
        <SignupForm id="cta-email" />
      </div>
    </section>
  );
}
