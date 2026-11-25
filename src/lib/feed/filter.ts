import type { Company, FeedFilters, Story, TimeRange } from "./types";

const DAY = 24 * 60 * 60 * 1000;

const MAX_AGE: Record<TimeRange, number> = {
  any: Infinity,
  "24h": DAY,
  "7d": 7 * DAY,
  "30d": 30 * DAY,
};

/** Narrows `stories` without reordering them. `now` is the feed's `generatedAt`. */
export function filterStories(
  stories: Story[],
  companies: Company[],
  filters: FeedFilters,
  now: string,
): Story[] {
  const { ticker, time, source } = filters;
  const query = filters.query.trim().toLowerCase();
  const names = new Map(companies.map((c) => [c.ticker, c.name]));
  const oldest = Date.parse(now) - MAX_AGE[time];

  return stories.filter(
    (story) =>
      (ticker === null || story.ticker === ticker) &&
      (source === null || story.publisher === source) &&
      Date.parse(story.publishedAt) >= oldest &&
      (query === "" ||
        [
          story.headline,
          story.ticker,
          names.get(story.ticker),
          story.publisher,
        ].some((text) => text?.toLowerCase().includes(query))),
  );
}

export function sourcesOf(stories: Story[]): string[] {
  return [...new Set(stories.map((s) => s.publisher))].sort((a, b) =>
    a.localeCompare(b, "en"),
  );
}
