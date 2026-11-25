import { cn } from "cn";
import { ExternalLinkIcon, ListPlusIcon, RowsIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SURFACE } from "@/components/brand/styles";
import { Section } from "@/components/landing/section";

type Step = { icon: LucideIcon; title: string; description: string };

const STEPS: Step[] = [
  {
    icon: ListPlusIcon,
    title: "Follow your tickers",
    description:
      "Add the companies on your watchlist. Your feed is built around them.",
  },
  {
    icon: RowsIcon,
    title: "See one grouped feed",
    description:
      "When several outlets cover the same story, you see it once, with its sources listed.",
  },
  {
    icon: ExternalLinkIcon,
    title: "Go to the original source",
    description:
      "Every story links to the publisher, so you can read it in full where it was written.",
  },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works" eyebrow="Three steps" title="How it works">
      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, description }) => (
          <li key={title} data-testid="how-card" className={cn(SURFACE, "p-5")}>
            <span className="flex size-10 items-center justify-center rounded-full bg-secondary">
              <Icon aria-hidden="true" className="size-5 text-link" />
            </span>
            <h3 className="mt-4 text-sm font-bold">{title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
