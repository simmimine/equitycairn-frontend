"use client";

import { cn } from "cn";
import { useId } from "react";

import { SURFACE, TEXT_LINK } from "@/components/brand/styles";
import { Button } from "@/components/ui/button";
import { coverageLabel, formatPublished } from "@/lib/feed/format";
import type { Story } from "@/lib/feed/types";

import { useComingSoon } from "./coming-soon";

export function StoryCard({ story }: { story: Story }) {
  const headingId = useId();
  const comingSoon = useComingSoon();

  return (
    <article
      aria-labelledby={headingId}
      className={cn(
        SURFACE,
        "flex min-w-0 flex-col gap-2.5 rounded-[13px] p-3.5 md:rounded-[14px] md:p-[18px]",
      )}
    >
      <div className="flex items-center gap-2 text-[11px] font-bold">
        <span className="flex h-6 min-w-[52px] items-center justify-center rounded-[7px] bg-secondary px-1.5 text-secondary-foreground">
          {story.ticker}
        </span>
        <span className="tracking-wide text-muted-foreground">SAMPLE</span>
        {story.isNew && (
          <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
            NEW
          </span>
        )}
      </div>
      <h2 id={headingId} className="text-[15px] font-bold break-words">
        {story.headline}
      </h2>
      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground md:flex-row md:gap-3">
        <span>{story.publisher}</span>
        <time dateTime={story.publishedAt}>
          {formatPublished(story.publishedAt)}
        </time>
      </div>
      <a
        href={story.originalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(TEXT_LINK, "text-xs")}
      >
        Original story <span aria-hidden="true">↗</span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      <hr />
      <div className="flex min-h-7 items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{coverageLabel(story)}</p>
        <Button
          variant="ghost"
          size="sm"
          className="hidden text-xs font-semibold text-link md:inline-flex"
          onClick={() => comingSoon("Coverage view")}
        >
          View coverage <span aria-hidden="true">→</span>
        </Button>
      </div>
    </article>
  );
}
