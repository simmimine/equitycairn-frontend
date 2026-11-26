"use client";

import { useState, useTransition } from "react";

import type { requestAccountLink } from "@/app/actions/account-link";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { LinkPurpose } from "@/lib/account/links";
import { attempt } from "@/lib/attempt";
import { ACCOUNT_LINK_TTL_MINUTES } from "@/lib/auth/constants";

import {
  ACTION,
  FIELD,
  FormStatus,
  GENERIC_ERROR,
  LABEL,
  SettingsCard,
  type Status,
} from "./parts";

const ERRORS: Record<string, string> = {
  send_failed: "We couldn't send the email. Please try again.",
  rate_limited: "Too many requests. Please wait a few minutes.",
};

function Row({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-1">
        <h3 className="text-[0.8125rem] font-semibold">{title}</h3>
        <p className="text-[0.6875rem] text-muted-foreground">{hint}</p>
      </div>
      <div className="flex flex-col gap-2 md:flex-row">{children}</div>
    </div>
  );
}

export function AccountSection({
  email,
  requestLink,
  signOut,
  signOutEverywhere,
}: {
  email: string;
  requestLink: typeof requestAccountLink;
  signOut: () => void | Promise<void>;
  signOutEverywhere: () => void | Promise<void>;
}) {
  // One message, under whichever link was asked for last.
  const [asked, setAsked] = useState<LinkPurpose | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [pending, startTransition] = useTransition();

  function ask(purpose: LinkPurpose) {
    setAsked(purpose);
    setStatus(null);
    startTransition(async () => {
      const result = await attempt(() => requestLink(purpose));
      if (result.ok) {
        setStatus({
          tone: "ok",
          text: `We sent a link to ${result.email}. It lasts ${ACCOUNT_LINK_TTL_MINUTES} minutes.`,
        });
      } else if (result.error === "unauthenticated") {
        setStatus({ tone: "ended" });
      } else {
        setStatus({
          tone: "error",
          text: ERRORS[result.error] ?? GENERIC_ERROR,
        });
      }
    });
  }

  return (
    <SettingsCard id="account" title="Account and security">
      <Field className="md:max-w-[360px]">
        <FieldLabel htmlFor="setting-email" className={LABEL}>
          Email
        </FieldLabel>
        <Input
          id="setting-email"
          value={email}
          readOnly
          className={FIELD + " bg-secondary text-muted-foreground"}
        />
      </Field>
      <Row title="Password" hint="We'll email you a link to change it.">
        <Button
          id="setting-password"
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => ask("password_change")}
          className={ACTION}
        >
          Change password
        </Button>
      </Row>
      {asked === "password_change" && <FormStatus status={status} />}
      <Row title="Sign out" hint="Of this device, or every device.">
        <form action={signOut}>
          <Button
            id="setting-sign-out"
            type="submit"
            variant="outline"
            className={ACTION}
          >
            Sign out
          </Button>
        </form>
        <form action={signOutEverywhere}>
          <Button
            id="setting-sign-out-all"
            type="submit"
            variant="outline"
            className={ACTION}
          >
            Sign out of all devices
          </Button>
        </form>
      </Row>
      <Row
        title="Delete account"
        hint="Permanent. We'll email you a link to confirm."
      >
        <Button
          id="setting-delete"
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => ask("account_delete")}
          className={`${ACTION} border-destructive text-destructive hover:text-destructive dark:border-destructive`}
        >
          Delete account
        </Button>
      </Row>
      {asked === "account_delete" && <FormStatus status={status} />}
    </SettingsCard>
  );
}
