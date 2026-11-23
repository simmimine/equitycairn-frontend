import { CheckIcon } from "lucide-react";

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
    <section aria-labelledby="trust" className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 md:py-24">
        <div className="flex flex-col gap-2">
          <h2
            id="trust"
            className="text-2xl font-semibold tracking-tight md:text-3xl"
          >
            News you can trace
          </h2>
          <p className="text-muted-foreground">
            Built to help you keep up, calmly and with the sources in view.
          </p>
        </div>
        <ul className="grid gap-6 sm:grid-cols-2">
          {POINTS.map((point) => (
            <li key={point.title} className="flex gap-3">
              <CheckIcon
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-primary"
              />
              <div className="flex flex-col gap-1">
                <h3 className="font-medium">{point.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {point.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
