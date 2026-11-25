import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { JoinBetaLink } from "@/components/landing/join-beta-link";

const SECTION_LINKS = [
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-card">
      <div className="mx-auto flex h-[62px] max-w-[1440px] items-center justify-between gap-4 px-5 md:h-[73px] md:px-8 lg:px-12">
        <Wordmark />
        <nav className="flex items-center gap-8">
          {SECTION_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="hidden text-sm font-medium text-muted-foreground hover:text-foreground md:inline"
            >
              {label}
            </a>
          ))}
          <Link
            href="/login"
            className="text-sm font-semibold text-link hover:underline md:ml-6"
          >
            Log in
          </Link>
          <JoinBetaLink />
        </nav>
      </div>
    </header>
  );
}
