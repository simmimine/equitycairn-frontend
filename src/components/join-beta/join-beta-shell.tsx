import Link from "next/link";

import { SiteFooter } from "@/components/landing/site-footer";

export function JoinBetaShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" className="text-base font-semibold tracking-tight">
            EquityCairn
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 sm:px-6 md:py-20">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
