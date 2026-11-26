"use client";

import { cn } from "cn";
import { useLayoutEffect, useRef, useState } from "react";

import type { requestAccountLink } from "@/app/actions/account-link";
import type { reportBugAction } from "@/app/actions/bug-report";
import type { saveProfileAction } from "@/app/actions/settings";
import { ComingSoonProvider } from "@/components/feed/coming-soon";
import { FOCUS_RING } from "@/components/feed/styles";
import { TabBar } from "@/components/feed/tab-bar";
import type { SignOutEverywhereResult } from "@/lib/auth/types";

import { AccountSection } from "./account-section";
import { AppearanceSection } from "./appearance-section";
import { BugSection } from "./bug-section";
import { PrivacySection } from "./privacy-section";
import { ProfileSection, type Profile } from "./profile-section";
import { SECTIONS } from "./sections";
import { SettingsHeader } from "./settings-header";
import { SubscriptionSection } from "./subscription-section";

export type SettingsActions = {
  saveProfile: typeof saveProfileAction;
  requestLink: typeof requestAccountLink;
  reportBug: typeof reportBugAction;
  signOut: () => void | Promise<void>;
  /** Resolves only on failure: success redirects. */
  signOutEverywhere: () => Promise<SignOutEverywhereResult | void>;
};

/** The same scroll padding as the feed: clear of the header and tab bar. */
const SCROLL_PADDING = "feed-scroll-padding";

export function SettingsApp({
  profile,
  email,
  supportEmail,
  fromPath,
  actions,
}: {
  profile: Profile;
  email: string;
  supportEmail: string | null;
  fromPath: string | null;
  actions: SettingsActions;
}) {
  const [current, setCurrent] = useState<string>(SECTIONS[0].id);
  const heading = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add(SCROLL_PADDING);
    return () => root.classList.remove(SCROLL_PADDING);
  }, []);

  return (
    <ComingSoonProvider fallbackRef={heading}>
      <SettingsHeader
        firstName={profile.firstName}
        signOutAction={actions.signOut}
      />
      <div className="flex flex-1">
        <nav
          aria-label="Settings sections"
          className="hidden w-[13.75rem] shrink-0 border-r bg-card px-3 pt-[22px] md:block lg:w-[16.25rem] lg:px-4"
        >
          <ul className="sticky top-[calc(4.6875rem+1.5rem)] flex flex-col gap-1.5">
            {SECTIONS.map(({ id, title }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  aria-current={current === id ? "location" : undefined}
                  onClick={() => setCurrent(id)}
                  className={cn(
                    FOCUS_RING,
                    "flex min-h-[2.625rem] items-center rounded-[10px] px-4 text-[0.8125rem]",
                    current === id
                      ? "bg-secondary font-bold"
                      : "font-medium text-muted-foreground hover:text-foreground",
                  )}
                >
                  {title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0 flex-1 px-5 pt-6 pb-[calc(4.125rem+env(safe-area-inset-bottom)+2rem)] md:px-10 md:pt-8 md:pb-12">
          <div className="mx-auto flex w-full max-w-[600px] flex-col gap-4 md:max-w-[760px] xl:mx-0">
            <div className="mb-2 flex flex-col gap-1.5">
              <h1
                ref={heading}
                tabIndex={-1}
                className={cn(
                  FOCUS_RING,
                  "rounded-sm text-[1.4375rem] font-bold md:text-[1.75rem]",
                )}
              >
                Settings
              </h1>
              <p className="text-[0.6875rem] text-muted-foreground md:text-xs">
                Manage your details and account.
              </p>
            </div>
            <ProfileSection profile={profile} save={actions.saveProfile} />
            <AppearanceSection />
            <AccountSection
              email={email}
              requestLink={actions.requestLink}
              signOut={actions.signOut}
              signOutEverywhere={actions.signOutEverywhere}
            />
            <SubscriptionSection />
            <BugSection fromPath={fromPath} report={actions.reportBug} />
            <PrivacySection supportEmail={supportEmail} />
          </div>
        </main>
      </div>
      <TabBar current="profile" />
    </ComingSoonProvider>
  );
}
