"use client";

import { useState, useTransition } from "react";

import {
  finishOnboardingAction,
  saveAboutAction,
  saveNameAction,
  saveWatchlistAction,
  type OnboardingResult,
} from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export type OnboardingStep = "name" | "about" | "welcome" | "watchlist";

export type OnboardingInitial = {
  firstName: string;
  lastName: string;
  role: string;
  experience: string;
  tickers: string;
};

const STEPS: OnboardingStep[] = ["name", "about", "welcome", "watchlist"];

const ROLES = [
  ["retail_investor", "Retail investor"],
  ["institutional_investor", "Institutional investor"],
  ["researcher_analyst", "Researcher or analyst"],
  ["financial_adviser", "Financial adviser or wealth professional"],
  ["other", "Other"],
] as const;

const EXPERIENCES = [
  ["beginner", "Beginner"],
  ["intermediate", "Intermediate"],
  ["experienced", "Experienced"],
] as const;

function errorText(
  step: OnboardingStep,
  result: OnboardingResult,
): string | null {
  if (result.ok) return null;
  if (result.error === "unauthenticated") {
    return "Your session has ended. Please log in again.";
  }
  if (result.error === "invalid" && step === "name") {
    return "Use letters, spaces, apostrophes, hyphens or periods (up to 60 characters).";
  }
  if (result.error === "invalid" && step === "watchlist") {
    return "Tickers are one to six letters, separated by spaces or commas.";
  }
  if (result.error === "too_many") return "You can follow up to 50 companies.";
  return "Something went wrong, please try again.";
}

function RadioGroup({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: readonly (readonly [string, string])[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FieldSet>
      <FieldLegend variant="label">{legend}</FieldLegend>
      {options.map(([v, label]) => (
        <label key={v} className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={name}
            value={v}
            checked={value === v}
            onChange={() => onChange(v)}
          />
          {label}
        </label>
      ))}
    </FieldSet>
  );
}

export function OnboardingFlow({
  initial,
  startStep,
}: {
  initial: OnboardingInitial;
  startStep: OnboardingStep;
}) {
  const [step, setStep] = useState<OnboardingStep>(startStep);
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [role, setRole] = useState(initial.role);
  const [experience, setExperience] = useState(initial.experience);
  const [tickers, setTickers] = useState(initial.tickers);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const index = STEPS.indexOf(step);
  const go = (next: OnboardingStep) => {
    setError(null);
    setStep(next);
  };
  const back = () => go(STEPS[Math.max(0, index - 1)]);

  function submit(
    action: () => Promise<OnboardingResult>,
    next: OnboardingStep | "done",
  ) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(errorText(step, result));
      } else if (next !== "done") {
        setStep(next);
      }
    });
  }

  const finish = () => finishOnboardingAction();
  const submitButton = (label: string) => (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending && <Spinner data-icon="inline-start" aria-hidden="true" />}
      {label}
    </Button>
  );
  const backButton = (
    <Button type="button" variant="ghost" onClick={back} disabled={pending}>
      Back
    </Button>
  );
  const skipButton = (onClick: () => void) => (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={pending}
    >
      Skip
    </Button>
  );

  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">
          Step {index + 1} of {STEPS.length}
        </p>
        {step === "name" && (
          <>
            <CardTitle>
              <h1>What should we call you?</h1>
            </CardTitle>
            <CardDescription>
              Your name, so we can greet you properly.
            </CardDescription>
          </>
        )}
        {step === "about" && (
          <>
            <CardTitle>
              <h1>About you</h1>
            </CardTitle>
            <CardDescription>
              Optional. This helps us understand who the beta is for. It never
              limits what you can see and isn&apos;t investment advice.
            </CardDescription>
          </>
        )}
        {step === "welcome" && (
          <CardTitle>
            <h1>Welcome to EquityCairn</h1>
          </CardTitle>
        )}
        {step === "watchlist" && (
          <>
            <CardTitle>
              <h1>Choose companies to follow</h1>
            </CardTitle>
            <CardDescription>
              Add a few tickers to start. You can change this anytime.
            </CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent>
        {step === "name" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit(() => saveNameAction(firstName, lastName), "about");
            }}
          >
            <FieldGroup>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="first-name">First name</FieldLabel>
                <Input
                  id="first-name"
                  autoComplete="given-name"
                  required
                  maxLength={60}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </Field>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="last-name">Last name</FieldLabel>
                <Input
                  id="last-name"
                  autoComplete="family-name"
                  required
                  maxLength={60}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
                {error && <FieldError>{error}</FieldError>}
              </Field>
              {submitButton("Continue")}
            </FieldGroup>
          </form>
        )}

        {step === "about" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit(() => saveAboutAction(role, experience), "welcome");
            }}
          >
            <FieldGroup>
              <RadioGroup
                legend="Role"
                name="role"
                options={ROLES}
                value={role}
                onChange={setRole}
              />
              <RadioGroup
                legend="Experience"
                name="experience"
                options={EXPERIENCES}
                value={experience}
                onChange={setExperience}
              />
              {error && <FieldError>{error}</FieldError>}
              {submitButton("Continue")}
              <div className="flex gap-2">
                {backButton}
                {skipButton(() => {
                  setRole("");
                  setExperience("");
                  submit(() => saveAboutAction("", ""), "welcome");
                })}
              </div>
            </FieldGroup>
          </form>
        )}

        {step === "welcome" && (
          <div className="flex flex-col gap-4">
            <p>
              EquityCairn organizes company news and links to publishers, so you
              can see what changed for the companies you follow and read the
              original story at its source.
            </p>
            <p className="text-sm text-muted-foreground">
              Coverage depends on the sources we have access to, and stories can
              take time to appear. We show the publisher and time on every item
              so you can judge for yourself.
            </p>
            <div className="flex gap-2">
              {backButton}
              <Button type="button" onClick={() => go("watchlist")}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === "watchlist" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (pending) return;
              setError(null);
              startTransition(async () => {
                const saved = await saveWatchlistAction(tickers);
                if (!saved.ok) {
                  setError(errorText("watchlist", saved));
                  return;
                }
                const done = await finish();
                if (!done.ok) setError(errorText("watchlist", done));
              });
            }}
          >
            <FieldGroup>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="tickers">Tickers</FieldLabel>
                <Input
                  id="tickers"
                  placeholder="AAPL, MSFT, TSLA"
                  autoComplete="off"
                  value={tickers}
                  onChange={(e) => setTickers(e.target.value)}
                />
                {error && <FieldError>{error}</FieldError>}
                <FieldDescription>
                  Separate tickers with spaces or commas.
                </FieldDescription>
              </Field>
              {submitButton("Finish")}
              <div className="flex gap-2">
                {backButton}
                {skipButton(() => {
                  if (pending) return;
                  setError(null);
                  startTransition(async () => {
                    const done = await finish();
                    if (!done.ok) setError(errorText("watchlist", done));
                  });
                })}
              </div>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
