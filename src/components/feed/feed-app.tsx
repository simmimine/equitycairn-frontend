"use client";

import { cn } from "cn";
import { useLayoutEffect, useMemo, useState } from "react";

import { SURFACE, TEXT_LINK } from "@/components/brand/styles";
import { Button } from "@/components/ui/button";
import { filterStories, sourcesOf } from "@/lib/feed/filter";
import { NO_FILTERS, type Feed, type FeedFilters } from "@/lib/feed/types";

import { AppHeader } from "./app-header";
import { ComingSoonProvider, useComingSoon } from "./coming-soon";
import { ContextPanel } from "./context-panel";
import { FeedFilterBar } from "./feed-filters";
import { Sidebar } from "./sidebar";
import { StoryCard } from "./story-card";
import { FOCUS_RING } from "./styles";
import { TabBar } from "./tab-bar";

/** Set on <html> while the feed is on screen; see globals.css. */
const SCROLL_PADDING = "feed-scroll-padding";

const STATE_CARD = cn(SURFACE, "flex flex-col gap-2 rounded-[14px] p-6");

export function FeedApp({
  feed,
  firstName,
  signOutAction,
}: {
  feed: Feed;
  firstName: string | null;
  signOutAction: () => void | Promise<void>;
}) {
  const [filters, setFilters] = useState<FeedFilters>(NO_FILTERS);
  const { companies, stories, generatedAt } = feed;

  const sources = useMemo(() => sourcesOf(stories), [stories]);
  const shown = useMemo(
    () => filterStories(stories, companies, filters, generatedAt),
    [stories, companies, filters, generatedAt],
  );

  // Keeps a focused element clear of the sticky header and the phone tab bar.
  // A layout effect, so a route hidden by Activity drops it too.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add(SCROLL_PADDING);
    return () => root.classList.remove(SCROLL_PADDING);
  }, []);

  const hasCompanies = companies.length > 0;

  return (
    <ComingSoonProvider>
      <AppHeader
        query={filters.query}
        onQueryChange={(query) => setFilters({ ...filters, query })}
        firstName={firstName}
        signOutAction={signOutAction}
      />
      <div className="flex">
        <Sidebar companies={companies} firstName={firstName} />
        <main className="min-w-0 flex-1 px-5 pt-6 pb-[calc(66px+env(safe-area-inset-bottom)+32px)] md:px-10 md:pt-8 md:pb-12">
          <div className="mx-auto grid w-full max-w-[600px] gap-y-6 md:max-w-[680px] xl:max-w-[1100px] xl:grid-cols-[minmax(0,680px)_390px] xl:grid-rows-[auto_auto_auto_1fr] xl:gap-x-[30px]">
            <div className="flex min-w-0 flex-col gap-4 xl:col-start-1">
              <div className="flex flex-col gap-1.5">
                <h1 className="text-[23px] font-bold md:text-[28px]">
                  News for your watchlist
                </h1>
                <p className="hidden text-xs text-muted-foreground md:block">
                  Company coverage, grouped and ordered by publication time.
                </p>
                <p className="text-xs text-muted-foreground md:hidden">
                  Coverage around your followed companies.
                </p>
              </div>
              {hasCompanies && (
                <>
                  <FeedFilterBar
                    companies={companies}
                    sources={sources}
                    filters={filters}
                    onChange={setFilters}
                  />
                  <div className="hidden items-center justify-between gap-3 text-[11px] text-muted-foreground md:flex">
                    <span className="font-semibold">Newest first</span>
                    <span className="font-medium">Example items</span>
                  </div>
                </>
              )}
            </div>

            <div className="min-w-0 xl:col-start-1">
              {!hasCompanies ? (
                <section aria-labelledby="feed-empty" className={STATE_CARD}>
                  <h2 id="feed-empty" className="text-base font-bold">
                    No companies yet
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Add companies to follow and their news will appear here.
                    Adding companies is coming soon.
                  </p>
                </section>
              ) : shown.length === 0 ? (
                <section
                  aria-labelledby="feed-no-match"
                  className={cn(STATE_CARD, "items-start")}
                >
                  <h2 id="feed-no-match" className="text-base font-bold">
                    No stories match these filters
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Try another company, time range, source or search.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => setFilters(NO_FILTERS)}
                  >
                    Clear filters
                  </Button>
                </section>
              ) : (
                <ul aria-label="Stories" className="flex flex-col gap-4">
                  {shown.map((story) => (
                    <li key={story.id}>
                      <StoryCard story={story} />
                    </li>
                  ))}
                </ul>
              )}
              {hasCompanies && (
                <p aria-live="polite" className="sr-only">
                  {shown.length === 1
                    ? "1 story shown"
                    : `${shown.length} stories shown`}
                </p>
              )}
            </div>

            {/* Below `xl` its children join the column under the stories; from
                `xl` it is the right-hand column, spanning every row. */}
            <div className="contents xl:col-start-2 xl:row-span-4 xl:row-start-1 xl:flex xl:flex-col xl:gap-6 xl:self-start">
              <ContextPanel companies={companies} />
              {hasCompanies && <ReportMismatch />}
            </div>

            <p className="hidden text-[11px] text-muted-foreground md:block xl:col-start-1 xl:mt-6">
              Example content only · sources shown here are placeholders.
            </p>
          </div>
        </main>
      </div>
      <TabBar />
    </ComingSoonProvider>
  );
}

function ReportMismatch() {
  const comingSoon = useComingSoon();
  return (
    <button
      type="button"
      onClick={() => comingSoon("Mismatch reporting")}
      className={cn(TEXT_LINK, FOCUS_RING, "-my-1 rounded-sm py-1 text-xs")}
    >
      Report a ticker mismatch
    </button>
  );
}
