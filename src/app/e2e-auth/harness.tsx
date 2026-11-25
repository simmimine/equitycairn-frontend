"use client";

import { useEffect, useMemo } from "react";

import type { ConfirmAccountResult } from "@/app/actions/confirm-account";
import { JoinBetaShell } from "@/components/join-beta/join-beta-shell";
import { BetaCheckEmail, VerifyResultView } from "@/components/join-beta/views";
import { BetaCard } from "@/components/landing/beta-card";
import { ConfirmScreen } from "@/components/login/confirm-screen";
import { LoginFlow, type LoginActions } from "@/components/login/login-flow";
import type { SignupAction } from "@/components/signup-form";

declare global {
  interface Window {
    /** Every fake action call, in order. Read by the e2e specs. */
    __authCalls?: { action: string; args: unknown[] }[];
  }
}

const PASSWORD_ERRORS = ["mismatch", "too_short", "common"];

function record(action: string, ...args: unknown[]) {
  (window.__authCalls ??= []).push({ action, args });
}

/** The query string picks which screen to show and what each fake returns. */
export function AuthHarness({
  params,
}: {
  params: Record<string, string | undefined>;
}) {
  // Specs wait for this before interacting, so no click lands before hydration.
  useEffect(() => {
    document.body.dataset.hydrated = "true";
  }, []);

  const {
    screen,
    state = "has_account",
    result = "ok",
    create = "ok",
    signIn = "invalid_credentials",
    cooldown = "0",
    delay = "0",
  } = params;

  const actions = useMemo(
    () =>
      ({
        checkEmail: async (email: string) => {
          record("checkEmail", email);
          return { ok: true, state };
        },
        createAccount: async (email: string, password: string) => {
          record("createAccount", email, password);
          if (create === "ok") return { ok: true, retryAfterSeconds: 60 };
          return PASSWORD_ERRORS.includes(create)
            ? { ok: false, error: "password", passwordError: create }
            : { ok: false, error: create };
        },
        resendBetaVerification: async (email: string) => {
          record("resendBetaVerification", email);
          return { ok: true, retryAfterSeconds: 60 };
        },
        signIn: async (email: string, password: string) => {
          record("signIn", email, password);
          return { ok: false, error: signIn };
        },
        // The query string is only ever written by our specs.
      }) as unknown as LoginActions,
    [state, create, signIn],
  );

  switch (screen) {
    case "login":
      return (
        <JoinBetaShell>
          <LoginFlow actions={actions} />
        </JoinBetaShell>
      );
    case "signup": {
      const action: SignupAction = async (_prev, formData) => {
        record("joinBeta", formData.get("email"));
        await new Promise((r) => setTimeout(r, Number(delay)));
        return (
          result === "ok" ? { ok: true } : { ok: false, error: result }
        ) as Awaited<ReturnType<SignupAction>>;
      };
      return (
        <main className="mx-auto w-full max-w-2xl p-5">
          <BetaCard inputId="e2e-email" action={action} />
        </main>
      );
    }
    case "beta-check":
      return (
        <BetaCheckEmail
          token="fake-token"
          cooldownSeconds={Number(cooldown)}
          resend={async (token) => {
            record("resendVerification", token);
            return result === "ok"
              ? { ok: true, retryAfterSeconds: 60 }
              : { ok: false, error: "server_error" };
          }}
        />
      );
    case "verify":
      return (
        <VerifyResultView
          result={
            result === "already_verified" ? "already_verified" : "verified"
          }
        />
      );
    case "confirm":
      return (
        <ConfirmScreen
          tokenHash="fake-hash"
          email="ann@example.com"
          confirm={async () =>
            ({ ok: false, error: result }) as ConfirmAccountResult
          }
        />
      );
    default:
      return null;
  }
}
