"use client";

import { useState, useTransition } from "react";

import type { saveProfileAction } from "@/app/actions/settings";
import { OptionCards } from "@/components/onboarding/option-cards";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { attempt } from "@/lib/attempt";
import { EXPERIENCE_OPTIONS, ROLE_OPTIONS } from "@/lib/onboarding/schema";

import {
  ACTION,
  CHOICE,
  FIELD,
  FormStatus,
  GENERIC_ERROR,
  LABEL,
  SettingsCard,
  type Status,
} from "./parts";

const NO_ANSWER = ["skip", "Prefer not to say"] as const;
const ROLES = [...ROLE_OPTIONS, NO_ANSWER];
const EXPERIENCES = [...EXPERIENCE_OPTIONS, NO_ANSWER];

export type Profile = {
  firstName: string;
  lastName: string;
  role: string | null;
  experience: string | null;
};

export function ProfileSection({
  profile,
  save,
}: {
  profile: Profile;
  save: typeof saveProfileAction;
}) {
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [role, setRole] = useState(profile.role ?? "skip");
  const [experience, setExperience] = useState(profile.experience ?? "skip");
  const [status, setStatus] = useState<Status>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setStatus(null);
    startTransition(async () => {
      const result = await attempt(() =>
        save({ firstName, lastName, role, experience }),
      );
      if (result.ok) setStatus({ tone: "ok", text: "Changes saved." });
      else if (result.error === "unauthenticated") {
        setStatus({ tone: "ended" });
      } else {
        setStatus({
          tone: "error",
          text:
            result.error === "invalid"
              ? "Use letters, spaces, apostrophes, hyphens or periods (up to 60 characters)."
              : GENERIC_ERROR,
        });
      }
    });
  }

  const name = (
    id: string,
    label: string,
    value: string,
    set: (v: string) => void,
    autoComplete: string,
  ) => (
    <Field>
      <FieldLabel htmlFor={id} className={LABEL}>
        {label}
      </FieldLabel>
      <Input
        id={id}
        value={value}
        onChange={(event) => set(event.target.value)}
        autoComplete={autoComplete}
        maxLength={60}
        required
        className={FIELD}
      />
    </Field>
  );

  return (
    <SettingsCard id="profile" title="Profile">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          {name(
            "setting-first-name",
            "First name",
            firstName,
            setFirstName,
            "given-name",
          )}
          {name(
            "setting-last-name",
            "Last name",
            lastName,
            setLastName,
            "family-name",
          )}
        </div>
        <div
          id="setting-role"
          tabIndex={-1}
          className="rounded-sm outline-none focus:ring-3 focus:ring-ring/50"
        >
          <OptionCards
            legend="Role"
            value={role}
            onValueChange={setRole}
            options={ROLES}
            clearable={false}
            legendClassName={LABEL}
            cardClassName={CHOICE}
          />
        </div>
        <div
          id="setting-experience"
          tabIndex={-1}
          className="rounded-sm outline-none focus:ring-3 focus:ring-ring/50"
        >
          <OptionCards
            legend="Experience"
            value={experience}
            onValueChange={setExperience}
            options={EXPERIENCES}
            clearable={false}
            legendClassName={LABEL}
            cardClassName={CHOICE}
          />
        </div>
        <FormStatus status={status} />
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className={ACTION + " md:self-start md:px-6"}
        >
          Save changes
        </Button>
      </form>
    </SettingsCard>
  );
}
