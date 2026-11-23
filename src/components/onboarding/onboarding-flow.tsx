"use client";

import { ArrowLeftIcon, ArrowRightIcon, TrendingUpIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";

import {
  finishOnboardingAction,
  saveAboutAction,
  saveNameAction,
  saveWatchlistAction,
  type OnboardingResult,
} from "@/app/actions/onboarding";
import { InfoCard } from "@/components/onboarding/info-card";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { OptionCards } from "@/components/onboarding/option-cards";
import { StockPicker } from "@/components/onboarding/stock-picker";
import { WatchlistPanel } from "@/components/onboarding/watchlist-panel";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  MAX_PICKS,
  parseStored,
  toggleTicker,
} from "@/lib/onboarding/companies";

export type OnboardingStep = "name" | "about" | "welcome" | "watchlist";

export type OnboardingInitial = {
  firstName: string;
  lastName: string;
  role: string;
  experience: string;
  tickers: string;
};

/** The server actions the flow talks to. Injectable so e2e can run without a backend. */
export type OnboardingActions = {
  saveName: (first: string, last: string) => Promise<OnboardingResult>;
  saveAbout: (role: string, experience: string) => Promise<OnboardingResult>;
  saveWatchlist: (tickers: string) => Promise<OnboardingResult>;
  finish: () => Promise<OnboardingResult>;
};

const REAL_ACTIONS: OnboardingActions = {
  saveName: saveNameAction,
  saveAbout: saveAboutAction,
  saveWatchlist: saveWatchlistAction,
  finish: finishOnboardingAction,
};

const STEPS: OnboardingStep[] = ["name", "about", "welcome", "watchlist"];
const FORM_ID = "onboarding-form";

const ROLES = [
  ["retail_investor", "Retail investor"],
  ["institutional_investor", "Institutional investor"],
  ["researcher_analyst", "Researcher / analyst"],
  ["financial_adviser", "Financial adviser"],
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
    return "Tickers are one to six letters (a dot is allowed), separated by spaces or commas.";
  }
  if (result.error === "too_many") return "You can follow up to 50 companies.";
  if (result.error === "already_onboarded") {
    return "You've already finished setting up.";
  }
  return "Something went wrong, please try again.";
}

/** Next's redirect() rejects with a control-flow error that must reach the router. */
function isRedirect(err: unknown): boolean {
  const digest = (err as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

function SkipLink({
  label,
  onClick,
  disabled,
  busy,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  busy: boolean;
}) {
  return (
    <Button
      type="button"
      variant="link"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy}
      className="text-primary"
    >
      {busy && <Spinner data-icon="inline-start" aria-hidden="true" />}
      {label}
    </Button>
  );
}

function StepHeading({
  eyebrow,
  eyebrowOnMobile = false,
  title,
  children,
}: {
  eyebrow: string;
  eyebrowOnMobile?: boolean;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2">
      <p
        className={`${eyebrowOnMobile ? "" : "hidden lg:block "}text-[11px] font-bold tracking-wider text-primary uppercase`}
      >
        {eyebrow}
      </p>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {children && <p className="text-muted-foreground">{children}</p>}
    </header>
  );
}

export function OnboardingFlow({
  initial,
  startStep,
  actions = REAL_ACTIONS,
}: {
  initial: OnboardingInitial;
  startStep: OnboardingStep;
  actions?: OnboardingActions;
}) {
  const [step, setStep] = useState<OnboardingStep>(startStep);
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [role, setRole] = useState(initial.role);
  const [experience, setExperience] = useState(initial.experience);
  const [picks, setPicks] = useState<string[]>(() =>
    parseStored(initial.tickers),
  );
  const [limited, setLimited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  // `pending` only flips on the next render, so a fast double click would slip past it.
  const inFlight = useRef(false);
  // Which control started the work, so only that one shows the spinner.
  const [busyBy, setBusyBy] = useState<"primary" | "skip">("primary");

  const index = STEPS.indexOf(step);
  const go = (next: OnboardingStep) => {
    setError(null);
    setLimited(false);
    setStep(next);
  };
  const back = () => go(STEPS[Math.max(0, index - 1)]);

  /** Runs one save/finish chain once at a time and turns every failure into a message. */
  function run(
    step: OnboardingStep,
    work: () => Promise<OnboardingResult | null>,
    source: "primary" | "skip" = "primary",
  ) {
    if (pending || inFlight.current) return;
    inFlight.current = true;
    setBusyBy(source);
    setError(null);
    startTransition(async () => {
      try {
        const result = await work();
        if (result && !result.ok) {
          if (result.error === "already_onboarded") router.replace("/feed");
          setError(errorText(step, result));
        }
      } catch (err) {
        if (isRedirect(err)) throw err;
        setError(errorText(step, { ok: false, error: "server_error" }));
      } finally {
        inFlight.current = false;
      }
    });
  }

  function submit(
    action: () => Promise<OnboardingResult>,
    next: OnboardingStep,
    opts: { source?: "primary" | "skip"; onOk?: () => void } = {},
  ) {
    run(
      step,
      async () => {
        const result = await action();
        if (result.ok) {
          opts.onOk?.();
          setStep(next);
        }
        return result;
      },
      opts.source,
    );
  }

  function finish(save: boolean) {
    if (save && picks.length > MAX_PICKS) {
      setError(
        `You can follow up to ${MAX_PICKS} companies. Remove ${picks.length - MAX_PICKS} to continue.`,
      );
      return;
    }
    run(
      "watchlist",
      async () => {
        if (save) {
          const saved = await actions.saveWatchlist(picks.join(" "));
          if (!saved.ok) return saved;
        }
        const done = await actions.finish();
        if (!done.ok && done.error === "invalid") {
          // finish() has no input; "invalid" there means the profile has no name yet.
          setError("Please go back and add your name first.");
          return null;
        }
        return done;
      },
      save ? "primary" : "skip",
    );
  }

  function toggle(ticker: string) {
    const next = toggleTicker(picks, ticker);
    setPicks(next.selected);
    setLimited(next.limited);
    // A "remove N to continue" error is stale as soon as the list changes.
    setError(null);
  }

  const primaryClass = "relative h-12 w-full rounded-xl text-sm font-semibold";
  const arrow = (
    <ArrowRightIcon
      data-icon="inline-end"
      aria-hidden="true"
      className="absolute right-4"
    />
  );
  const spinner = pending && busyBy === "primary" && (
    <Spinner data-icon="inline-start" aria-hidden="true" />
  );
  const linkClass = "text-primary";

  const backButton = index > 0 && (
    <Button
      type="button"
      variant="link"
      onClick={back}
      disabled={pending}
      className={`self-start px-0 ${linkClass}`}
    >
      <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
      Back
    </Button>
  );

  const submitButton = (label: string) => (
    <Button
      type="submit"
      form={FORM_ID}
      disabled={pending}
      aria-busy={pending && busyBy === "primary"}
      className={primaryClass}
    >
      {spinner}
      {label}
      {arrow}
    </Button>
  );
  let main: ReactNode;
  let info: ReactNode;
  let actions_: ReactNode;

  if (step === "name") {
    main = (
      <>
        <StepHeading eyebrow="Step 1" title="What should we call you?">
          Add the name you’d like us to use.
        </StepHeading>
        <form
          id={FORM_ID}
          onSubmit={(event) => {
            event.preventDefault();
            submit(() => actions.saveName(firstName, lastName), "about");
          }}
        >
          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="first-name">First name</FieldLabel>
              <Input
                id="first-name"
                autoComplete="given-name"
                placeholder="Enter your first name"
                required
                maxLength={60}
                className="h-[54px] rounded-xl"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </Field>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="last-name">Last name</FieldLabel>
              <Input
                id="last-name"
                autoComplete="family-name"
                placeholder="Enter your last name"
                required
                maxLength={60}
                className="h-[54px] rounded-xl"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              {error && <FieldError>{error}</FieldError>}
            </Field>
            <FieldDescription>
              Use the name you’d like us to use in the app.
            </FieldDescription>
          </FieldGroup>
        </form>
      </>
    );
    info = (
      <InfoCard
        title="A personal touch"
        callout="Your name is only used for your account experience."
      >
        <p>We’ll use your name to make your account feel like yours.</p>
      </InfoCard>
    );
    actions_ = submitButton("Continue");
  } else if (step === "about") {
    main = (
      <>
        <StepHeading eyebrow="Step 2" title="About you">
          Tell us a little about your investing experience.
        </StepHeading>
        <form
          id={FORM_ID}
          onSubmit={(event) => {
            event.preventDefault();
            submit(() => actions.saveAbout(role, experience), "welcome");
          }}
        >
          <FieldGroup>
            <OptionCards
              legend="What best describes your role?"
              options={ROLES}
              value={role}
              onValueChange={setRole}
            />
            <OptionCards
              legend="How would you describe your experience?"
              options={EXPERIENCES}
              value={experience}
              onValueChange={setExperience}
            />
            <FieldDescription>
              Both questions are optional and editable later.
            </FieldDescription>
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
        </form>
      </>
    );
    info = (
      <InfoCard
        title="Why we ask"
        callout={
          <>
            <p className="font-semibold text-foreground">
              Used for product learning
            </p>
            <p>in aggregate, not advice.</p>
          </>
        }
      >
        <p>Your answers help us understand who the beta is useful for.</p>
        <p>They won’t restrict access or change what you can follow.</p>
      </InfoCard>
    );
    actions_ = (
      <>
        {submitButton("Continue")}
        <SkipLink
          label="Skip for now"
          disabled={pending}
          busy={pending && busyBy === "skip"}
          onClick={() =>
            submit(() => actions.saveAbout("", ""), "welcome", {
              source: "skip",
              // Only wipe the answers once the save worked, so a failure keeps them.
              onOk: () => {
                setRole("");
                setExperience("");
              },
            })
          }
        />
      </>
    );
  } else if (step === "welcome") {
    main = (
      <>
        <StepHeading eyebrow="Step 3" title="Welcome to EquityCairn">
          Know what matters across your watchlist, from one feed.
        </StepHeading>
        <div className="flex flex-col gap-5">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary">
            <TrendingUpIcon aria-hidden="true" className="size-6" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">
              A clearer view of company news.
            </h2>
            <p className="max-w-md text-muted-foreground">
              Follow companies to see relevant coverage grouped around the
              tickers you choose.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">What to expect</h3>
            <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
              {[
                "Publisher and original link stay visible.",
                "Coverage and update timing vary by source.",
                "Your feed is information, not advice.",
              ].map((line) => (
                <li key={line} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full bg-primary"
                  />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </>
    );
    info = (
      <InfoCard
        title="A focused start"
        callout={
          <>
            <p className="font-semibold text-foreground">
              Sources remain attributed.
            </p>
            <p>No buying or selling advice.</p>
          </>
        }
      >
        <p>
          First, choose a few companies to follow. Then your feed will bring
          their coverage together.
        </p>
      </InfoCard>
    );
    actions_ = (
      <Button
        type="button"
        onClick={() => go("watchlist")}
        className={primaryClass}
      >
        Choose companies
        {arrow}
      </Button>
    );
  } else {
    main = (
      <>
        <StepHeading
          eyebrow="Build your watchlist"
          eyebrowOnMobile
          title="Choose companies to follow"
        >
          Add a few companies and we’ll bring their coverage into one focused
          feed. Your picks are easy to change later.
        </StepHeading>
        <form
          id={FORM_ID}
          onSubmit={(event) => {
            event.preventDefault();
            finish(true);
          }}
        >
          <StockPicker selected={picks} limited={limited} onToggle={toggle} />
          {error && <FieldError className="mt-4">{error}</FieldError>}
        </form>
      </>
    );
    info = <WatchlistPanel selected={picks} onRemove={toggle} />;
    actions_ = (
      <>
        {submitButton("Continue")}
        <SkipLink
          label="I’ll do this later"
          disabled={pending}
          busy={pending && busyBy === "skip"}
          onClick={() => finish(false)}
        />
      </>
    );
  }

  return (
    <OnboardingShell
      index={index}
      main={
        <>
          {main}
          {backButton}
        </>
      }
      info={info}
      actions={
        // Keyed by step so each step gets fresh buttons. Otherwise React reuses the
        // welcome step's type="button" node as the next step's type="submit" button
        // mid-click, and the browser submits that step's form straight away.
        <div
          key={step}
          className="flex flex-col items-stretch gap-1 text-center"
        >
          {actions_}
        </div>
      }
    />
  );
}
