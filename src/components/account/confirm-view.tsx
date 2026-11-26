"use client";

import { useRef, useState, useTransition } from "react";

import type { ConfirmResult } from "@/app/actions/account-link";
import { AuthCard } from "@/components/join-beta/auth-card";
import { JoinBetaShell } from "@/components/join-beta/join-beta-shell";
import { LinkScreen } from "@/components/join-beta/link-screen";
import {
  PASSWORD_MESSAGES,
  PasswordField,
} from "@/components/login/password-fields";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { LinkPurpose } from "@/lib/account/links";
import { attempt } from "@/lib/attempt";

type Failure = Extract<ConfirmResult, { ok: false }>;

function message(failure: Failure): string {
  switch (failure.error) {
    case "password":
      return PASSWORD_MESSAGES[failure.passwordError];
    case "rejected":
      return "That password was rejected. Choose a different one.";
    case "rate_limited":
      return "Too many attempts. Please wait a few minutes and try again.";
    default:
      // The link may be used up by now, so retrying here can't be promised.
      return "Something went wrong. Request a new link from Settings and try again.";
  }
}

export function InvalidLinkScreen() {
  return (
    <LinkScreen
      title="This link no longer works"
      description="Request a new one from Settings."
      href="/settings"
      action="Open Settings"
    />
  );
}

/**
 * The emailed link's page. `purpose` is null for a dead link. Only the first
 * value counts: using the link makes Next redraw the page with a dead link,
 * which must not replace this view's own outcome.
 */
export function ConfirmView({
  purpose: current,
  token,
  changePassword,
  deleteAccount,
}: {
  purpose: LinkPurpose | null;
  token: string;
  changePassword: (
    token: string,
    password: string,
    confirm: string,
  ) => Promise<ConfirmResult>;
  deleteAccount: (token: string) => Promise<ConfirmResult>;
}) {
  const [purpose] = useState(current);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [pending, startTransition] = useTransition();
  // `pending` updates after a render; this stops a second press before then.
  const running = useRef(false);
  const deleting = purpose === "account_delete";

  if (!purpose) return <InvalidLinkScreen />;
  if (result?.ok) {
    return deleting ? (
      <LinkScreen
        title="Account deleted"
        description="Your account and its data have been removed."
        href="/"
        action="Back to home"
        icon="check"
      />
    ) : (
      <LinkScreen
        title="Password changed"
        description="You've been signed out everywhere. Log in again with your new password."
        href="/"
        action="Back to home"
        icon="check"
      />
    );
  }
  if (result && result.error === "expired") return <InvalidLinkScreen />;

  return (
    <JoinBetaShell>
      <AuthCard
        title={deleting ? "Delete your account" : "Choose a new password"}
        description={
          deleting
            ? "This is permanent. Your profile, watchlist, bug reports and beta sign-up are removed, and it can't be undone."
            : "You'll be signed out on every device."
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (running.current) return;
            running.current = true;
            startTransition(async () => {
              setResult(
                await attempt(() =>
                  deleting
                    ? deleteAccount(token)
                    : changePassword(token, password, confirm),
                ),
              );
              running.current = false;
            });
          }}
        >
          <FieldGroup>
            {!deleting && (
              <>
                <PasswordField
                  id="new-password"
                  label="New password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                />
                <PasswordField
                  id="confirm-new-password"
                  label="Confirm new password"
                  value={confirm}
                  onChange={setConfirm}
                  autoComplete="new-password"
                />
              </>
            )}
            {result && !result.ok && <FieldError>{message(result)}</FieldError>}
            <Button
              type="submit"
              size="xl"
              variant={deleting ? "destructive" : "default"}
              disabled={pending}
              aria-busy={pending}
            >
              {pending && (
                <Spinner data-icon="inline-start" aria-hidden="true" />
              )}
              {deleting ? "Delete my account" : "Change password"}
            </Button>
          </FieldGroup>
        </form>
      </AuthCard>
    </JoinBetaShell>
  );
}
