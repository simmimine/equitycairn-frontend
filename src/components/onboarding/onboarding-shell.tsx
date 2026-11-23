import type { ReactNode } from "react";

import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { Progress } from "@/components/ui/progress";

export const STEP_LABELS = [
  "Your name",
  "About you",
  "Welcome",
  "Choose companies",
] as const;

function TopBar({ counter }: { counter?: string }) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-6 lg:h-[72px]">
        <span className="text-lg font-bold tracking-tight">equitycairn</span>
        {counter && (
          <span
            aria-hidden="true"
            className="text-sm font-semibold text-muted-foreground tabular-nums lg:hidden"
          >
            {counter}
          </span>
        )}
        <span className="hidden text-[10px] font-semibold tracking-wider text-muted-foreground uppercase lg:block">
          Set up your feed
        </span>
      </div>
    </header>
  );
}

/** Shown while the server resolves the session and profile. */
export function OnboardingFallback() {
  return (
    <div className="flex min-h-svh flex-col">
      <TopBar />
      <main className="flex-1">
        <p role="status" className="sr-only">
          Loading…
        </p>
      </main>
    </div>
  );
}

/**
 * Page chrome from the design: top bar, left rail (progress + stepper), the step
 * itself, and a right column (info card + actions). One DOM for every breakpoint:
 * the rail's stepper and the info card are desktop-only, and the actions stick to
 * the bottom of the screen on mobile.
 */
export function OnboardingShell({
  index,
  main,
  info,
  actions,
}: {
  index: number;
  main: ReactNode;
  info: ReactNode;
  actions: ReactNode;
}) {
  const total = STEP_LABELS.length;
  const counter = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

  return (
    <div className="flex min-h-svh flex-col">
      <TopBar counter={counter} />
      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-x-10 gap-y-6 px-6 pt-4 pb-0 lg:grid-cols-[250px_minmax(0,1fr)_342px] lg:py-10">
        <nav
          aria-label="Onboarding steps"
          className="flex flex-col gap-3 lg:border-r lg:pr-10"
        >
          <Progress
            value={((index + 1) / total) * 100}
            aria-label="Onboarding progress"
            className="gap-0"
          />
          <p className="text-[10px] font-bold tracking-wider text-primary uppercase">
            Step {index + 1} of {total}
          </p>
          <OnboardingStepper
            className="hidden lg:flex"
            labels={STEP_LABELS}
            current={index}
          />
        </nav>
        <main className="flex min-w-0 flex-col gap-6">{main}</main>
        <aside className="sticky bottom-0 -mx-6 flex flex-col gap-4 bg-background px-6 pt-3 pb-6 lg:static lg:mx-0 lg:bg-transparent lg:p-0">
          <div className="hidden lg:block">{info}</div>
          {actions}
        </aside>
      </div>
    </div>
  );
}
