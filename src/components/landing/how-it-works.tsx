import { ExternalLinkIcon, ListPlusIcon, RowsIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <section aria-labelledby="how-it-works" className="border-t bg-muted/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 md:py-24">
        <h2
          id="how-it-works"
          className="text-2xl font-semibold tracking-tight md:text-3xl"
        >
          How it works
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex">
              <Card className="flex-1">
                <CardHeader>
                  <Icon
                    aria-hidden="true"
                    className="mb-2 size-5 text-primary"
                  />
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
