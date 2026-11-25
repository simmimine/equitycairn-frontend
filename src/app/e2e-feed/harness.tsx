"use client";

import { useEffect } from "react";

import { FeedApp } from "@/components/feed/feed-app";
import type { Feed } from "@/lib/feed/types";

declare global {
  interface Window {
    /** Every fake action call, in order. Read by the e2e specs. */
    __authCalls?: { action: string; args: unknown[] }[];
  }
}

async function signOut() {
  (window.__authCalls ??= []).push({ action: "signOut", args: [] });
}

/** The real feed with a fake sign out, so specs need no Supabase session. */
export function FeedHarness({
  feed,
  firstName,
}: {
  feed: Feed;
  firstName: string | null;
}) {
  // Specs wait for this before interacting, so no click lands before hydration.
  useEffect(() => {
    document.body.dataset.hydrated = "true";
  }, []);

  return <FeedApp feed={feed} firstName={firstName} signOutAction={signOut} />;
}
