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
import { INPUT } from "@/components/brand/styles";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { attempt } from "@/lib/attempt";
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
  confirm = confirmAccount,
}: {
  tokenHash: string;
  email: string;
  confirm?: typeof confirmAccount;
}) {
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<ConfirmAccountResult | null>(null);
  const [pending, startTransition] = useTransition();
  const wrong = result?.error === "wrong_password";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        startTransition(async () => {
          setResult(await attempt(() => confirm(tokenHash, email, password)));
        });
      }}
    >
      <FieldGroup>
        <Field data-invalid={wrong || undefined}>
          <FieldLabel htmlFor="confirm-password">Password</FieldLabel>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            className={INPUT}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setResult(null);
            }}
            aria-invalid={wrong || undefined}
            aria-describedby={result ? "confirm-error" : "confirm-hint"}
          />
          {result && (
            <FieldError id="confirm-error">{message(result)}</FieldError>
          )}
          <FieldDescription id="confirm-hint" className="text-[11px]">
            Enter the password you chose when you signed up.
          </FieldDescription>
        </Field>
        <Button type="submit" size="xl" disabled={pending} aria-busy={pending}>
          {pending && <Spinner data-icon="inline-start" aria-hidden="true" />}
          Finish creating account
        </Button>
        {result?.error === "expired" && (
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline", size: "xl" }))}
          >
            Start again
          </Link>
        )}
      </FieldGroup>
    </form>
  );
}
