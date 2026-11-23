import { JoinBetaLink } from "@/components/landing/join-beta-link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#top" className="text-base font-semibold tracking-tight">
          EquityCairn
        </a>
        <JoinBetaLink />
      </div>
    </header>
  );
}
