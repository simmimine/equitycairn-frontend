"use client";

import { useEffect, useMemo, useState } from "react";

declare global {
  interface Window {
    /** Every fake action call, in order. Read by e2e/onboarding.spec.ts. */
    __onboardingCalls?: Call[];
  }
}

import {
  OnboardingFlow,
  type OnboardingActions,
  type OnboardingStep,
} from "@/components/onboarding/onboarding-flow";

type Call = { action: string; args: unknown[] };

/** Fake actions that record every call; `fail` names an action that rejects as invalid. */
export function OnboardingHarness({
  startStep,
  tickers,
  fail,
  delayMs,
}: {
  startStep: OnboardingStep;
  tickers: string;
  fail: string;
  delayMs: number;
}) {
  const [done, setDone] = useState(false);

  // Specs wait for this before interacting: the server-rendered HTML is visible well
  // before React hydrates, and an early click would submit the form natively.
  useEffect(() => {
    document.body.dataset.hydrated = "true";
  }, []);

  const actions = useMemo<OnboardingActions>(() => {
    const run = async (action: string, args: unknown[], onOk?: () => void) => {
      // Recorded synchronously, outside React state: state set inside the flow's
      // transition can commit after the UI has already moved on, which made specs racy.
      (window.__onboardingCalls ??= []).push({ action, args });
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      if (fail === action) {
        // "finish" has no input to be invalid; it fails like a server fault.
        const error = action === "finish" ? "server_error" : "invalid";
        return { ok: false, error } as const;
      }
      onOk?.();
      return { ok: true } as const;
    };
    return {
      saveName: (first, last) => run("saveName", [first, last]),
      saveAbout: (role, exp) => run("saveAbout", [role, exp]),
      saveWatchlist: (t) => run("saveWatchlist", [t]),
      finish: () => run("finish", [], () => setDone(true)),
    };
  }, [fail, delayMs]);

  return (
    <>
      {done ? (
        <p role="status">Onboarding finished</p>
      ) : (
        <OnboardingFlow
          startStep={startStep}
          actions={actions}
          initial={{
            firstName: startStep === "name" ? "" : "Ann",
            lastName: startStep === "name" ? "" : "Lee",
            role: "",
            experience: "",
            tickers,
          }}
        />
      )}
    </>
  );
}
