"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  confirmAccount,
  type ConfirmAccountResult,
} from "@/app/actions/confirm-account";
import { buttonVariants, Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function message(result: ConfirmAccountResult): string {
  switch (result.error) {
    case "wrong_password":
      return "That doesn't match the password you created.";
    case "expired":
      return "This link has expired or was already used.";
    case "rate_limited":
      return "Too many attempts. Please wait a few minutes and try again.";
    default:
      return "Something went wrong, please try again.";
  }
}

export function ConfirmForm({
  tokenHash,
  email,
}: {
  tokenHash: string;
  email: string;
}) {
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<ConfirmAccountResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        startTransition(async () => {
          setResult(await confirmAccount(tokenHash, email, password));
        });
      }}
    >
      <FieldGroup>
        <Field data-invalid={result ? true : undefined}>
          <FieldLabel htmlFor="confirm-password">Password</FieldLabel>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setResult(null);
            }}
            aria-invalid={result ? true : undefined}
            aria-describedby="confirm-error"
          />
          {result && (
            <FieldError id="confirm-error">{message(result)}</FieldError>
          )}
          <FieldDescription>
            Enter the password you chose when you signed up.
          </FieldDescription>
        </Field>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending && <Spinner data-icon="inline-start" aria-hidden="true" />}
          Finish creating account
        </Button>
        {result?.error === "expired" && (
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Start again
          </Link>
        )}
      </FieldGroup>
    </form>
  );
}
