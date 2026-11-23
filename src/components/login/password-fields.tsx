"use client";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PasswordError } from "@/lib/auth/types";

export const PASSWORD_MESSAGES: Record<PasswordError, string> = {
  too_short: "Use at least 12 characters",
  too_long: "That password is too long (72 bytes at most)",
  mismatch: "Passwords don't match",
  common: "That password is too common, choose another",
  invalid: "Enter a password",
};

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "new-password" | "current-password";
  error?: string | null;
  hint?: string;
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="password"
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      {hint && !error && <FieldDescription>{hint}</FieldDescription>}
    </Field>
  );
}
