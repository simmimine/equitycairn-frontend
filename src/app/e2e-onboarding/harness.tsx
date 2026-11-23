"use client";

import { useMemo, useState } from "react";

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
  const [calls, setCalls] = useState<Call[]>([]);
  const [done, setDone] = useState(false);

  const actions = useMemo<OnboardingActions>(() => {
    const run = async (action: string, args: unknown[], onOk?: () => void) => {
      setCalls((c) => [...c, { action, args }]);
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
      <pre data-testid="calls" hidden>
        {JSON.stringify(calls)}
      </pre>
    </>
  );
}
