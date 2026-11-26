"use client";

import { cn } from "cn";
import { Search } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isSearchShortcut, useShortcutHint } from "@/lib/search-shortcut";
import { searchSettings, type SettingEntry } from "@/lib/settings/search";

const LABEL = "Search settings";
const LIST = "settings-search-results";
/** Tailwind's `md`: from here the search field is always on screen. */
const DESKTOP = "(min-width: 48rem)";
const isDesktop = () => window.matchMedia(DESKTOP).matches;

const KEY =
  "pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border px-1.5 font-sans text-[0.6875rem] text-muted-foreground md:block";

/**
 * Finds a setting and moves focus to it. Choosing a result never presses the
 * control, so searching cannot sign out or start a deletion.
 */
export function SettingsSearch() {
  const input = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  // Only phones hide the field; from `md` it is always on screen.
  const [open, setOpen] = useState(false);
  const results = searchSettings(query);
  const listed = focused && query.trim() !== "";
  const hint = useShortcutHint();

  const close = useCallback(() => {
    setQuery("");
    setActive(0);
    setOpen(false);
  }, []);
  // A hidden route keeps its state (Activity): come back with search closed.
  useLayoutEffect(() => close, [close]);

  const openSearch = useCallback(() => {
    // A hidden field cannot take focus, so show it first, still inside the
    // user's gesture (phones only raise the keyboard then).
    flushSync(() => setOpen(true));
    input.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isSearchShortcut(event)) return;
      event.preventDefault();
      openSearch();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openSearch]);

  // Crossing `md` starts the phone row closed.
  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP);
    const onChange = () => setOpen(false);
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  function choose({ id }: SettingEntry) {
    // Closed first, so the header is its usual height when the page scrolls.
    flushSync(close);
    document.getElementById(id)?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    // An open notice took this Escape (see ComingSoonProvider).
    if (event.nativeEvent.defaultPrevented) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      // Does nothing from `md`, where the button is not displayed.
      toggle.current?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((active + step + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (results[active]) choose(results[active]);
    }
  }

  return (
    <>
      <div
        className={cn(
          "relative order-last basis-full pb-3 md:order-none md:block md:pb-0",
          !open && "hidden",
        )}
      >
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-[0.8125rem] left-3.5 size-4 text-muted-foreground"
          />
          <Input
            ref={input}
            type="text"
            role="combobox"
            aria-label={LABEL}
            aria-expanded={listed}
            aria-controls={LIST}
            aria-autocomplete="list"
            aria-activedescendant={
              listed && results[active] ? `${LIST}-${active}` : undefined
            }
            autoComplete="off"
            placeholder={LABEL}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onFocus={() => {
              setFocused(true);
              if (!isDesktop()) setOpen(true);
            }}
            onBlur={() => setFocused(false)}
            onKeyDown={onKeyDown}
            // 16px on touch screens of any width, or iOS zooms in on focus.
            className="h-[2.625rem] rounded-[11px] bg-background pl-10 md:pr-16 md:text-base md:pointer-fine:text-sm"
          />
          {query ? (
            <kbd aria-hidden="true" className={KEY}>
              Esc
            </kbd>
          ) : (
            hint && (
              <kbd aria-hidden="true" className={KEY}>
                {hint}
              </kbd>
            )
          )}
          <div
            className={cn(
              "absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-[14px] border bg-popover text-popover-foreground shadow-lg",
              !listed && "hidden",
            )}
            // Keeps focus in the field while a result is pressed.
            onMouseDown={(event) => event.preventDefault()}
          >
            <ul
              id={LIST}
              role="listbox"
              aria-label="Matching settings"
              className="max-h-[min(20rem,60dvh)] overflow-y-auto p-2 empty:hidden"
            >
              {listed &&
                results.map((result, index) => (
                  <li
                    key={result.id}
                    id={`${LIST}-${index}`}
                    role="option"
                    aria-selected={index === active}
                    onClick={() => choose(result)}
                    onPointerMove={() => setActive(index)}
                    className={cn(
                      "flex cursor-pointer flex-col gap-1 rounded-[10px] px-3 py-2",
                      index === active && "bg-secondary",
                    )}
                  >
                    <span className="text-[0.8125rem] font-semibold">
                      {result.title}
                    </span>
                    <span className="text-[0.6875rem] text-muted-foreground">
                      {result.section}
                    </span>
                  </li>
                ))}
            </ul>
            {/* Always present, so the change of text is announced. */}
            <p role="status" className="px-5 py-4 text-sm empty:hidden">
              {listed && results.length === 0 ? "No settings match" : ""}
            </p>
            {results.length > 0 && (
              <p
                aria-hidden="true"
                className="hidden border-t px-5 py-2 text-[0.6875rem] text-muted-foreground md:block"
              >
                ↑ ↓ to move · Enter to open · Esc to close
              </p>
            )}
          </div>
        </div>
      </div>
      <Button
        ref={toggle}
        type="button"
        variant="ghost"
        size="icon-lg"
        aria-label="Search"
        aria-expanded={open}
        onClick={open ? close : openSearch}
        className="ml-auto md:hidden"
      >
        <Search />
      </Button>
    </>
  );
}
