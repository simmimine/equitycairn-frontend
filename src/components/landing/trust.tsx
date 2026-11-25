import { cn } from "cn";
import { CheckIcon } from "lucide-react";

import { SURFACE } from "@/components/brand/styles";
import { Section } from "@/components/landing/section";

const POINTS = [
  {
    title: "Clear source attribution",
    description: "Every story shows which publishers reported it.",
  },
  {
    title: "Duplicates grouped",
    description:
      "The same story from many outlets appears once, not over and over.",
  },
  {
    title: "Links to the originals",
    description: "We point you to the publisher's article, not a rewrite.",
  },
  {
    title: "No trading advice",
    description: "We show you the news. We don't tell you what to buy or sell.",
  },
];

export function Trust() {
  return (
    <Section
      id="trust"
      eyebrow="Sources in view"
      title="News you can trace"
      description="Built to help you keep up, calmly and with the sources in view."
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {POINTS.map((point) => (
          <li
            key={point.title}
            data-testid="trust-card"
            className={cn(SURFACE, "p-5")}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-secondary">
              <CheckIcon aria-hidden="true" className="size-5 text-link" />
            </span>
            <h3 className="mt-4 text-sm font-bold">{point.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {point.description}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
