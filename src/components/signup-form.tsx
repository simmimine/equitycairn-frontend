"use client";

import { useActionState, useState } from "react";

import { joinBeta } from "@/app/actions/join-beta";
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
import { parseEmail } from "@/lib/signup/email";
import type { JoinBetaResult } from "@/lib/signup/types";

const INVALID_EMAIL_MESSAGE = "Enter a valid email address";
const SERVER_ERROR_MESSAGE = "Something went wrong, please try again";

export function SignupForm({ id = "email" }: { id?: string }) {
  const [email, setEmail] = useState("");
  const [state, formAction, pending] = useActionState(
    async (prev: JoinBetaResult | null, formData: FormData) => {
      const result = await joinBeta(prev, formData);
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
        : SERVER_ERROR_MESSAGE
      : null;
  const error = clientError ?? serverError;
  const invalid = error !== null;
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
      <FieldGroup>
        <Field data-invalid={invalid || undefined}>
          <FieldLabel htmlFor={id}>Email</FieldLabel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={id}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              readOnly={pending}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? errorId : descriptionId}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setClientError(null);
                setDismissed(state);
              }}
            />
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending && (
                <Spinner data-icon="inline-start" aria-hidden="true" />
              )}
              Join the beta
            </Button>
          </div>
          {invalid && <FieldError id={errorId}>{error}</FieldError>}
          <p role="status" className="text-sm text-primary empty:hidden">
            {!invalid && current?.ok ? "You're on the list" : null}
          </p>
          <FieldDescription id={descriptionId}>
            No spam. We&apos;ll only email you about the beta.
          </FieldDescription>
        </Field>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-[9999px] opacity-0"
        >
          <input
            type="text"
            name="company_url_hp"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
      </FieldGroup>
    </form>
  );
}
