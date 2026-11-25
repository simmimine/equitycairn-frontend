import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SampleFeed } from "@/components/landing/sample-feed";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Trust } from "@/components/landing/trust";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="top" className="flex-1 scroll-mt-20">
        <Hero />
        <SampleFeed />
        <HowItWorks />
        <Trust />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
