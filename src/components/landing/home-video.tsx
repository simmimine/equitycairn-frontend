"use client";

import { PauseIcon, PlayIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Full-width product animation, rendered from `remotion/home` and published into
 * `public/` with `pnpm video:publish:home`.
 */
export function HomeVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  // The visitor's last choice; null until they press the button.
  const choice = useRef<boolean | null>(null);

  useEffect(() => {
    const el = video.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Plays only while on screen, so nothing downloads or moves above the fold.
    const observer = new IntersectionObserver(
      (entries) => {
        // The last entry is the current state.
        if (!entries.at(-1)?.isIntersecting) el.pause();
        else if (choice.current ?? !calm) el.play().catch(() => undefined);
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      // Next may hide this page rather than remove it.
      el.pause();
    };
  }, []);

  function toggle() {
    const el = video.current;
    if (!el) return;
    choice.current = el.paused;
    if (el.paused) el.play().catch(() => undefined);
    else el.pause();
  }

  const Icon = playing ? PauseIcon : PlayIcon;

  return (
    <section aria-label="EquityCairn in motion" className="relative w-full">
      <video
        ref={video}
        className="block aspect-video h-auto w-full"
        poster="/images/home-watchlist-poster.jpg"
        width={1440}
        height={810}
        muted
        loop
        playsInline
        preload="none"
        aria-label="Illustration: scattered coverage about a company gathers into one grouped feed. Less noise, more signal."
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <source src="/videos/home-watchlist.webm" type="video/webm" />
        <source src="/videos/home-watchlist.mp4" type="video/mp4" />
      </video>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="absolute right-3 bottom-3"
        aria-label={playing ? "Pause video" : "Play video"}
        onClick={toggle}
      >
        <Icon aria-hidden="true" />
      </Button>
    </section>
  );
}
