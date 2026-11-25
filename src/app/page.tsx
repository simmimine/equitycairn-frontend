import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { HomeVideo } from "@/components/landing/home-video";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SampleFeed } from "@/components/landing/sample-feed";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Trust } from "@/components/landing/trust";

export default function Home() {
  return (
    <div className="home flex flex-1 flex-col">
      <SiteHeader />
      <main id="top" className="flex-1 scroll-mt-20">
        {/* At least a screen tall (less the header), so the video that follows
            always starts below the fold. */}
        <div className="first-screen">
          <Hero />
          <SampleFeed />
        </div>
        <HomeVideo />
        <HowItWorks />
        <Trust />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
