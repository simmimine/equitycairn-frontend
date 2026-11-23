export const CATEGORIES = [
  "All",
  "Technology",
  "Finance",
  "Healthcare",
  "Consumer",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Company = {
  ticker: string;
  name: string;
  category: Exclude<Category, "All">;
  /** Tailwind classes for the monogram tile (brand-ish colors from the design). */
  tone: string;
};

/** The design's starter list. Tickers must satisfy the server's TICKER pattern. */
export const POPULAR_COMPANIES: Company[] = [
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    category: "Technology",
    tone: "bg-[#101820] text-white",
  },
  {
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    category: "Technology",
    tone: "bg-[#1e70d1] text-white",
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corporation",
    category: "Technology",
    tone: "bg-[#142d4e] text-white",
  },
  {
    ticker: "V",
    name: "Visa Inc.",
    category: "Finance",
    tone: "bg-[#6b1a2b] text-white",
  },
  {
    ticker: "JNJ",
    name: "Johnson & Johnson",
    category: "Healthcare",
    tone: "bg-[#5a8a5a] text-white",
  },
  {
    ticker: "KO",
    name: "Coca-Cola Company",
    category: "Consumer",
    tone: "bg-[#1a5c4a] text-white",
  },
  {
    ticker: "GOOGL",
    name: "Alphabet Inc.",
    category: "Technology",
    tone: "bg-[#366fbf] text-white",
  },
  {
    ticker: "AMZN",
    name: "Amazon.com, Inc.",
    category: "Consumer",
    tone: "bg-[#2a3b4c] text-white",
  },
  {
    ticker: "JPM",
    name: "JPMorgan Chase & Co.",
    category: "Finance",
    tone: "bg-[#3d4f66] text-white",
  },
  {
    ticker: "PFE",
    name: "Pfizer Inc.",
    category: "Healthcare",
    tone: "bg-[#2f5fa8] text-white",
  },
  {
    ticker: "MCD",
    name: "McDonald's Corporation",
    category: "Consumer",
    tone: "bg-[#a3331f] text-white",
  },
  {
    ticker: "MA",
    name: "Mastercard Incorporated",
    category: "Finance",
    tone: "bg-[#8a3a1f] text-white",
  },
];

/** Design: "3 / 10". The server's own cap (MAX_WATCHLIST) stays as a backstop. */
export const MAX_PICKS = 10;

const TICKER_LIKE = /^[A-Z.]{1,6}$/;

export function filterCompanies(query: string, category: Category): Company[] {
  const q = query.trim().toLowerCase();
  return POPULAR_COMPANIES.filter(
    (c) =>
      (category === "All" || c.category === category) &&
      (q === "" ||
        c.name.toLowerCase().includes(q) ||
        c.ticker.toLowerCase().includes(q)),
  );
}

/** A ticker the user could add by hand: valid shape, not already listed or picked. */
export function tickerCandidate(
  query: string,
  selected: readonly string[],
): string | null {
  const raw = query.trim();
  const t = raw.toUpperCase();
  if (!TICKER_LIKE.test(t)) return null;
  // Typed in lower case, only short input reads as a symbol ("tsla"); longer words
  // ("tesla", "netflix") are company names that aren't in the starter list.
  if (raw !== t && raw.length > 4) return null;
  if (selected.includes(t)) return null;
  // A word that names a company ("apple", "micro") is a search, not a ticker, and adding it
  // would save junk. Short queries ("F", "GE") are too ambiguous to rule out: real tickers.
  if (t.length >= 3 && filterCompanies(t, "All").length > 0) return null;
  return t;
}

export function toggleTicker(
  selected: readonly string[],
  ticker: string,
): { selected: string[]; limited: boolean } {
  if (selected.includes(ticker)) {
    return { selected: selected.filter((t) => t !== ticker), limited: false };
  }
  if (selected.length >= MAX_PICKS) {
    return { selected: [...selected], limited: true };
  }
  return { selected: [...selected, ticker], limited: false };
}

export function parseStored(stored: string): string[] {
  const parts = stored
    .split(/[\s,]+/)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);
  return [...new Set(parts)];
}
