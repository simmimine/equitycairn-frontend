export type Company = { ticker: string; name: string | null };

export type Story = {
  id: string;
  ticker: string;
  headline: string;
  publisher: string;
  kind: "news" | "filing";
  /** ISO 8601, UTC. */
  publishedAt: string;
  linkCount: number;
  originalUrl: string;
  isNew: boolean;
};

export type Feed = {
  companies: Company[];
  stories: Story[];
  generatedAt: string;
};

export type TimeRange = "any" | "24h" | "7d" | "30d";

export type FeedFilters = {
  /** null = All */
  ticker: string | null;
  time: TimeRange;
  /** null = Any source */
  source: string | null;
  query: string;
};

export const NO_FILTERS: FeedFilters = {
  ticker: null,
  time: "any",
  source: null,
  query: "",
};
