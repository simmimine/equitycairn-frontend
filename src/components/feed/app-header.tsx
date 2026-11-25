"use client";

import { cn } from "cn";
import { Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { AccountMenu } from "./account-menu";
import { useComingSoon } from "./coming-soon";

const SEARCH_LABEL = "Search companies, tickers, or stories";

export function AppHeader({
  query,
  onQueryChange,
  firstName,
  signOutAction,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  firstName: string | null;
  signOutAction: () => void | Promise<void>;
}) {
  const comingSoon = useComingSoon();
  const input = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  // Only phones hide the field; from `md` it is always on screen.
  const [open, setOpen] = useState(false);
  const shown = open || query !== "";

  const openSearch = useCallback(() => {
    // A hidden field cannot take focus, so show it before focusing, still
    // inside the user's gesture (phones only raise the keyboard then).
    flushSync(() => setOpen(true));
    input.current?.focus();
  }, []);

  function closeSearch() {
    onQueryChange("");
    setOpen(false);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      openSearch();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openSearch]);

  return (
    <header className="sticky top-0 z-20 border-b bg-card">
      <div className="flex flex-wrap items-center gap-x-3 px-5 md:grid md:grid-cols-[1fr_minmax(0,510px)_1fr] md:gap-x-6 md:px-8">
        <Link
          href="/feed"
          className="flex h-[63px] w-fit items-center text-[17px] font-bold md:h-[75px] md:text-[19px]"
        >
          equitycairn
        </Link>
        <div
          className={cn(
            "relative order-last basis-full pb-3 md:order-none md:block md:pb-0",
            !shown && "hidden",
          )}
        >
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-[13px] left-3.5 size-4 text-muted-foreground"
          />
          <Input
            ref={input}
            type="search"
            aria-label={SEARCH_LABEL}
            placeholder={SEARCH_LABEL}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              closeSearch();
              // Does nothing from `md`, where the button is not displayed.
              toggle.current?.focus();
            }}
            className="h-[42px] rounded-[11px] bg-background pl-10 md:pr-14"
          />
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border px-1.5 font-sans text-[11px] text-muted-foreground md:block"
          >
            ⌘ K
          </kbd>
        </div>
        <div className="ml-auto flex items-center gap-2 md:justify-self-end">
          <Button
            ref={toggle}
            variant="ghost"
            size="icon-lg"
            aria-label="Search"
            aria-expanded={shown}
            onClick={shown ? closeSearch : openSearch}
            className="md:hidden"
          >
            <Search />
          </Button>
          <Button
            variant="ghost"
            onClick={() => comingSoon("Help")}
            className="hidden text-muted-foreground md:inline-flex"
          >
            Help
          </Button>
          <AccountMenu firstName={firstName} signOutAction={signOutAction} />
        </div>
      </div>
    </header>
  );
}
