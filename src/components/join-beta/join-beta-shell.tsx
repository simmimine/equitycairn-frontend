import Link from "next/link";

import { SURFACE } from "@/components/brand/styles";
import { Wordmark } from "@/components/brand/wordmark";

function BrandPanel() {
  return (
    <aside
      aria-label="About EquityCairn"
      className="hidden flex-col rounded-[20px] bg-secondary p-11 lg:flex"
    >
      <span
        aria-hidden="true"
        className="flex size-[52px] items-center justify-center rounded-full bg-primary text-[27px] font-bold text-primary-foreground"
      >
        e
      </span>
      <p className="mt-8 text-[11px] font-bold tracking-wide text-link uppercase">
        EquityCairn
      </p>
      <p className="mt-7 max-w-xs text-3xl leading-[1.36] font-bold">
        Company news, organized around your watchlist.
      </p>
      <p className="mt-6 max-w-60 text-xs leading-[23px] text-muted-foreground">
        Follow the companies you care about. See grouped coverage with the
        source, timestamp, and original link in view.
      </p>
      <div className={`${SURFACE} mt-auto mb-9 rounded-xl p-[18px]`}>
        <p className="text-xs font-bold">Private beta</p>
        <p className="mt-2 text-[11px] leading-[19px] text-muted-foreground">
          A focused financial news workspace.
          <br />
          No buy/sell advice or predictions.
        </p>
      </div>
    </aside>
  );
}

/** Frame for every sign-up and login screen: header, brand panel, card, footnote. */
export function JoinBetaShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b bg-card">
        <div className="mx-auto flex h-[62px] max-w-[1440px] items-center justify-between px-5 md:h-[73px] md:px-8 lg:px-12">
          <Wordmark />
          <Link
            href="/"
            className="text-sm font-semibold text-link hover:underline"
          >
            <span className="md:hidden">Home</span>
            <span className="hidden md:inline">Back to home</span>
          </Link>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-[1440px] flex-1 content-start px-5 pt-[43px] md:px-8 md:pt-16 lg:grid-cols-[568fr_640fr] lg:gap-x-[60px] lg:px-[86px]">
        <BrandPanel />
        <main className="mx-auto flex w-full max-w-[640px] flex-col lg:max-w-none">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-[640px] py-8 text-[11px] text-muted-foreground lg:col-start-2 lg:max-w-none lg:py-10">
          <p>
            <span className="hidden md:inline">EquityCairn · </span>
            Informational news, not investment advice.
          </p>
        </footer>
      </div>
    </>
  );
}
