"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  checkEmail,
  createAccount,
  resendBetaVerification,
  signIn,
} from "@/app/actions/login";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
const RATE_LIMITED =
  "Too many attempts. Please wait a few minutes and try again.";

function Shell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>{title}</h1>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" onClick={onClick}>
      Use a different email
    </Button>
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
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending && <Spinner data-icon="inline-start" aria-hidden="true" />}
      {children}
    </Button>
  );
}

function EmailCard({ onNext }: { onNext: (step: Step) => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Shell title="Log in" description="Enter your email to continue.">
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
            const result = await checkEmail(email);
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
            <FieldLabel htmlFor="login-email">Email</FieldLabel>
            <Input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
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
    </Shell>
  );
}

function CreateCard({
  email,
  onBack,
  onNext,
}: {
  email: string;
  onBack: () => void;
  onNext: (step: Step) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Shell title="Create your password" description={email}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          setError(null);
          startTransition(async () => {
            const result = await createAccount(email, password, confirm);
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
            hint="At least 12 characters."
          />
          <PasswordField
            id="create-confirm"
            label="Confirm password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            error={error}
          />
          <SubmitButton pending={pending}>Create account</SubmitButton>
        </FieldGroup>
      </form>
      <BackButton onClick={onBack} />
    </Shell>
  );
}

function SignInCard({ email, onBack }: { email: string; onBack: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Shell title="Welcome back" description={email}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          setError(null);
          startTransition(async () => {
            // On success the action redirects and never returns.
            const result = await signIn(email, password);
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
    </Shell>
  );
}

export function LoginFlow() {
  const [step, setStep] = useState<Step>({ name: "email" });
  const back = () => setStep({ name: "email" });

  switch (step.name) {
    case "email":
      return <EmailCard onNext={setStep} />;
    case "not_listed":
      return (
        <Shell
          title="This email isn't on the beta list yet"
          description="Join the beta and we'll let you know when it's your turn."
        >
          <Link href="/#join" className={buttonVariants()}>
            Join the beta
          </Link>
          <BackButton onClick={back} />
        </Shell>
      );
    case "unverified":
      return (
        <Shell
          title="Verify your beta sign-up first"
          description="You're on the list, but we haven't confirmed this email yet. Open the link we sent you, or ask for a new one."
        >
          <CooldownButton
            initialCooldownSeconds={step.cooldown ?? 0}
            onResend={() => resendBetaVerification(step.email)}
          />
          <BackButton onClick={back} />
        </Shell>
      );
    case "create":
      return <CreateCard email={step.email} onBack={back} onNext={setStep} />;
    case "signin":
      return <SignInCard email={step.email} onBack={back} />;
    case "check_email":
      return (
        <Shell
          title="Check your email"
          description="We've sent a link to finish creating your account. You'll be asked for the password you just chose."
        >
          <CooldownButton
            initialCooldownSeconds={step.cooldown ?? 60}
            onResend={() =>
              createAccount(
                step.email,
                step.password ?? "",
                step.password ?? "",
              )
            }
          />
          <BackButton onClick={back} />
        </Shell>
      );
  }
}
