"use client";

import Link from "next/link";
import { useRef } from "react";

import { AccountMenu } from "@/components/feed/account-menu";
import { useHeightVariable } from "@/components/feed/use-height-variable";

export function SettingsHeader({
  firstName,
  signOutAction,
}: {
  firstName: string | null;
  signOutAction: () => void | Promise<void>;
}) {
  const header = useRef<HTMLElement>(null);
  // For the page's scroll padding (globals.css).
  useHeightVariable(header, "--feed-header-height");
  return (
    <header ref={header} className="sticky top-0 z-20 border-b bg-card">
      <div className="flex flex-wrap items-center gap-x-3 px-5 md:grid md:grid-cols-[1fr_minmax(0,510px)_1fr] md:gap-x-6 md:px-8">
        <Link
          href="/feed"
          className="flex h-[3.9375rem] w-fit items-center text-[1.0625rem] font-bold md:h-[4.6875rem] md:text-[1.1875rem]"
        >
          equitycairn
        </Link>
        <div className="ml-auto flex items-center gap-2 md:col-start-3 md:justify-self-end">
          <AccountMenu firstName={firstName} signOutAction={signOutAction} />
        </div>
      </div>
    </header>
  );
}
