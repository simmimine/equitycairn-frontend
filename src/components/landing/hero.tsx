import { SampleFeed } from "@/components/landing/sample-feed";
import { SignupForm } from "@/components/signup-form";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            The market news that matters to your watchlist.
          </h1>
          <p className="text-lg text-muted-foreground text-pretty">
            Know what matters across your watchlist, from one feed.
          </p>
        </div>
        <section id="join" aria-label="Join the beta" className="scroll-mt-20">
          <SignupForm id="hero-email" />
        </section>
      </div>
      <SampleFeed />
    </section>
  );
}
