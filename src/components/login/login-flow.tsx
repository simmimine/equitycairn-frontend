"use client";

import { cn } from "cn";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";

import {
  checkEmail,
  createAccount,
  resendBetaVerification,
  signIn,
} from "@/app/actions/login";
import { INPUT, TEXT_LINK } from "@/components/brand/styles";
import { AuthCard, AuthNotice } from "@/components/join-beta/auth-card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { parseEmail } from "@/lib/signup/email";

import { CooldownButton } from "./cooldown-button";
import { PASSWORD_MESSAGES, PasswordField } from "./password-fields";

export type LoginActions = {
  checkEmail: typeof checkEmail;
  createAccount: typeof createAccount;
  resendBetaVerification: typeof resendBetaVerification;
  signIn: typeof signIn;
};

const ACTIONS: LoginActions = {
  checkEmail,
  createAccount,
  resendBetaVerification,
  signIn,
};

type Step =
  | { name: "email" }
  | {
      name: "not_listed" | "unverified" | "create" | "signin" | "check_email";
      email: string;
      cooldown?: number;
      /** Kept in memory only, so "re-send" can re-run createAccount. */
      password?: string;
    };

const GENERIC_ERROR = "Something went wrong, please try again";
/** An action that can't be reached (offline, say) becomes a result, not a crash. */
async function attempt<T>(action: Promise<T>) {
  try {
    return await action;
  } catch (err) {
    unstable_rethrow(err); // a successful sign-in redirects by throwing
    return { ok: false, error: "server_error" } as const;
  }
}

const RATE_LIMITED =
  "Too many attempts. Please wait a few minutes and try again.";

function BackButton({
  onClick,
  children = "Use a different email",
}: {
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={TEXT_LINK}>
      {children}
    </button>
  );
}

function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button type="submit" size="xl" disabled={pending} aria-busy={pending}>
      {pending && <Spinner data-icon="inline-start" aria-hidden="true" />}
      {children}
    </Button>
  );
}

function EmailCard({
  actions,
  onNext,
}: {
  actions: LoginActions;
  onNext: (step: Step) => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <AuthCard title="Log in" description="Enter your email to continue.">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          if (!parseEmail(email).ok) {
            setError("Enter a valid email address");
            return;
          }
          setError(null);
          startTransition(async () => {
            const result = await attempt(actions.checkEmail(email));
            if (result.ok) {
              const clean = email.trim().toLowerCase();
              onNext({
                name:
                  result.state === "no_account"
                    ? "create"
                    : result.state === "has_account"
                      ? "signin"
                      : result.state,
                email: clean,
                cooldown: 0,
              });
            } else if (result.error === "rate_limited") {
              setError(RATE_LIMITED);
            } else if (result.error === "invalid_email") {
              setError("Enter a valid email address");
            } else {
              setError(GENERIC_ERROR);
            }
          });
        }}
      >
        <FieldGroup>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="login-email" className="text-xs font-semibold">
              Email
            </FieldLabel>
            <Input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              className={INPUT}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-email-error" : undefined}
            />
            {error && <FieldError id="login-email-error">{error}</FieldError>}
          </Field>
          <SubmitButton pending={pending}>Continue</SubmitButton>
        </FieldGroup>
      </form>
      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-muted-foreground">
          Only verified beta members can create an account.
        </p>
        <Link href="/#join" className={TEXT_LINK}>
          New to the beta? Join the beta
        </Link>
      </div>
    </AuthCard>
  );
}

function CreateCard({
  actions,
  email,
  onBack,
  onNext,
}: {
  actions: LoginActions;
  email: string;
  onBack: () => void;
  onNext: (step: Step) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <AuthCard title="Create your password">
      <AuthNotice data-testid="email-chip">
        <span className="min-w-0 break-all">{email}</span>
      </AuthNotice>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          setError(null);
          startTransition(async () => {
            const result = await attempt(
              actions.createAccount(email, password, confirm),
            );
            if (result.ok) {
              onNext({
                name: "check_email",
                email,
                cooldown: result.retryAfterSeconds,
                password,
              });
            } else if (result.error === "password") {
              setError(PASSWORD_MESSAGES[result.passwordError]);
            } else if (result.error === "cooldown") {
              setError("Please wait a minute before trying again");
            } else if (result.error === "rate_limited") {
              setError(RATE_LIMITED);
            } else if (result.error === "not_member") {
              setError("This email isn't a verified beta member");
            } else if (result.error === "has_account") {
              setError(
                "This email already has an account. Go back and log in.",
              );
            } else {
              setError(GENERIC_ERROR);
            }
          });
        }}
      >
        <FieldGroup>
          <PasswordField
            id="create-password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder="Enter your password"
            describedBy="create-hint"
          />
          <PasswordField
            id="create-confirm"
            label="Confirm password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            placeholder="Enter it again"
            error={error}
          />
          <p
            id="create-hint"
            className="-mt-3 text-[11px] text-muted-foreground"
          >
            At least 12 characters.
          </p>
          <SubmitButton pending={pending}>Create account</SubmitButton>
        </FieldGroup>
      </form>
      <BackButton onClick={onBack}>
        <span aria-hidden="true">← </span>Back to email
      </BackButton>
    </AuthCard>
  );
}

function SignInCard({
  actions,
  email,
  onBack,
}: {
  actions: LoginActions;
  email: string;
  onBack: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <AuthCard title="Welcome back">
      <AuthNotice data-testid="email-chip">
        <span className="min-w-0 break-all">{email}</span>
        <button type="button" onClick={onBack} className={TEXT_LINK}>
          Change
        </button>
      </AuthNotice>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          setError(null);
          startTransition(async () => {
            // On success the action redirects and never returns.
            const result = await attempt(actions.signIn(email, password));
            if (result.error === "invalid_credentials") {
              setError("Email or password is incorrect");
            } else if (result.error === "unconfirmed") {
              setError(
                "Your account isn't confirmed yet. Check your email for the link.",
              );
            } else if (result.error === "rate_limited") {
              setError(RATE_LIMITED);
            } else {
              setError(GENERIC_ERROR);
            }
          });
        }}
      >
        <FieldGroup>
          <PasswordField
            id="signin-password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            error={error}
          />
          <SubmitButton pending={pending}>Sign in</SubmitButton>
        </FieldGroup>
      </form>
      <BackButton onClick={onBack} />
    </AuthCard>
  );
}

export function LoginFlow({
  actions = ACTIONS,
}: {
  /** Replaced by fakes on the e2e page; the real ones need Supabase. */
  actions?: LoginActions;
}) {
  const [step, setStep] = useState<Step>({ name: "email" });
  const back = () => setStep({ name: "email" });

  // Each card is keyed so React never reuses one step's buttons for the next.
  switch (step.name) {
    case "email":
      return <EmailCard key="email" actions={actions} onNext={setStep} />;
    case "not_listed":
      return (
        <AuthCard
          key="not_listed"
          title="This email isn't on the beta list yet"
          description="Join the beta and we'll let you know when it's your turn."
        >
          <Link href="/#join" className={cn(buttonVariants({ size: "xl" }))}>
            Join the beta
          </Link>
          <BackButton onClick={back} />
        </AuthCard>
      );
    case "unverified":
      return (
        <AuthCard
          key="unverified"
          title="Verify your beta sign-up first"
          description="You're on the list, but we haven't confirmed this email yet. Open the link we sent you, or ask for a new one."
          icon="mail"
        >
          <CooldownButton
            initialCooldownSeconds={step.cooldown ?? 0}
            onResend={() => actions.resendBetaVerification(step.email)}
          />
          <BackButton onClick={back} />
        </AuthCard>
      );
    case "create":
      return (
        <CreateCard
          key="create"
          actions={actions}
          email={step.email}
          onBack={back}
          onNext={setStep}
        />
      );
    case "signin":
      return (
        <SignInCard
          key="signin"
          actions={actions}
          email={step.email}
          onBack={back}
        />
      );
    case "check_email":
      return (
        <AuthCard
          key="check_email"
          title="Check your email"
          description="We've sent a link to finish creating your account. You'll be asked for the password you just chose."
          icon="mail"
        >
          <AuthNotice>
            <span className="min-w-0 break-all">
              Account confirmation link sent to {step.email}.
            </span>
          </AuthNotice>
          <CooldownButton
            initialCooldownSeconds={step.cooldown ?? 60}
            onResend={() =>
              actions.createAccount(
                step.email,
                step.password ?? "",
                step.password ?? "",
              )
            }
          />
          <p className="text-[11px] text-muted-foreground">
            If you don’t see it, check your spam folder.
          </p>
          <div className="mt-auto pt-4">
            <BackButton onClick={back}>Back to log in</BackButton>
          </div>
        </AuthCard>
      );
  }
}
