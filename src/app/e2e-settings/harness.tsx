"use client";

import { useEffect } from "react";

import { ConfirmView } from "@/components/account/confirm-view";
import {
  SettingsApp,
  type SettingsActions,
} from "@/components/settings/settings-app";

function record(action: string, args: unknown[]) {
  (window.__authCalls ??= []).push({ action, args });
}

const EMAIL = "you@example.com";

const actions: SettingsActions = {
  saveProfile: async (input) => {
    record("saveProfile", [input]);
    return { ok: true };
  },
  requestLink: async (purpose) => {
    record("requestLink", [purpose]);
    return { ok: true, email: EMAIL };
  },
  reportBug: async (input) => {
    record("reportBug", [input]);
    return { ok: true };
  },
  signOut: async () => record("signOut", []),
  signOutEverywhere: async () => record("signOutEverywhere", []),
};

/** The real screens with fake actions, so specs need no Supabase session. */
export function SettingsHarness({ view }: { view: string | null }) {
  // Specs wait for this before interacting, so no click lands before hydration.
  useEffect(() => {
    document.body.dataset.hydrated = "true";
  }, []);

  if (view === "confirm-password" || view === "confirm-delete") {
    return (
      <ConfirmView
        purpose={
          view === "confirm-delete" ? "account_delete" : "password_change"
        }
        token="e2e-token"
        changePassword={async (...args) => {
          record("changePassword", args);
          return { ok: true };
        }}
        deleteAccount={async (token) => {
          record("deleteAccount", [token]);
          return { ok: true };
        }}
      />
    );
  }
  return (
    <SettingsApp
      profile={{
        firstName: "Simeon",
        lastName: "Example",
        role: "retail_investor",
        experience: "intermediate",
      }}
      email={EMAIL}
      supportEmail="support@example.com"
      fromPath="/feed"
      actions={actions}
    />
  );
}
