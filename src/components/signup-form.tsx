"use client";

import { useActionState, useState } from "react";

import { joinBeta } from "@/app/actions/join-beta";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { INPUT } from "@/components/brand/styles";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { attempt } from "@/lib/attempt";
import { HONEYPOT_FIELD } from "@/lib/signup/honeypot";
import { parseEmail } from "@/lib/signup/email";
import type { JoinBetaResult } from "@/lib/signup/types";

const INVALID_EMAIL_MESSAGE = "Enter a valid email address";
const RATE_LIMITED_MESSAGE = "Please wait a minute before trying again";
const SERVER_ERROR_MESSAGE = "Something went wrong, please try again";

export type SignupAction = typeof joinBeta;

export function SignupForm({
  id = "email",
  action = joinBeta,
}: {
  id?: string;
  /** Replaced by a fake on the e2e page; the real one writes to Supabase. */
  action?: SignupAction;
}) {
  const [email, setEmail] = useState("");
  const [state, formAction, pending] = useActionState(
    async (prev: JoinBetaResult | null, formData: FormData) => {
      const result: JoinBetaResult = await attempt(() =>
        action(prev, formData),
      );
      if (result.ok) setEmail("");
      return result;
    },
    null,
  );
  const [clientError, setClientError] = useState<string | null>(null);
  // Result the user has edited past; hides stale server messages until a new one arrives.
  const [dismissed, setDismissed] = useState<JoinBetaResult | null>(null);
  const current = state === dismissed ? null : state;

  const serverError =
    current && !current.ok
      ? current.error === "invalid_email"
        ? INVALID_EMAIL_MESSAGE
        : current.error === "rate_limited"
          ? RATE_LIMITED_MESSAGE
          : SERVER_ERROR_MESSAGE
      : null;
  const error = clientError ?? serverError;
  const invalid = error !== null;
  const showSuccess = !invalid && current?.ok === true;
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={(event) => {
        const email = new FormData(event.currentTarget).get("email");
        if (!parseEmail(email).ok) {
          event.preventDefault();
          setClientError(INVALID_EMAIL_MESSAGE);
          return;
        }
        setClientError(null);
      }}
    >
      <FieldGroup className="gap-4">
        <Field data-invalid={invalid || undefined}>
          <FieldLabel htmlFor={id} className="text-xs font-semibold">
            Email address
          </FieldLabel>
          <Input
            id={id}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            readOnly={pending}
            className={INPUT}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? errorId : descriptionId}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setClientError(null);
              setDismissed(state);
            }}
          />
          {invalid && <FieldError id={errorId}>{error}</FieldError>}
        </Field>
        <Button type="submit" size="xl" disabled={pending} aria-busy={pending}>
          {pending && <Spinner data-icon="inline-start" aria-hidden="true" />}
          Request beta access
        </Button>
        <p
          role="status"
          className={showSuccess ? "text-sm text-link" : "sr-only"}
        >
          {showSuccess ? "You're on the list" : null}
        </p>
        <div className="flex flex-col gap-3 text-[11px] text-muted-foreground">
          <p id={descriptionId}>
            We’ll email you a link to confirm your address.
          </p>
          <p className="hidden md:block">
            No publisher account linking required.
          </p>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-[9999px] opacity-0"
        >
          <input
            type="text"
            name={HONEYPOT_FIELD}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
      </FieldGroup>
    </form>
  );
}
