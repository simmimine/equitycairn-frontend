"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { OptionCards } from "@/components/onboarding/option-cards";

import { SettingsCard } from "./parts";

const THEMES = [
  ["light", "Light"],
  ["dark", "Dark"],
  ["system", "System"],
] as const;

const noChanges = () => () => {};

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  // The server cannot know the stored theme: mark none until hydrated.
  const mounted = useSyncExternalStore(
    noChanges,
    () => true,
    () => false,
  );
  return (
    <SettingsCard id="appearance" title="Appearance">
      <div id="setting-theme" tabIndex={-1}>
        <OptionCards
          legend="Applies to this device."
          value={mounted ? (theme ?? "system") : ""}
          onValueChange={setTheme}
          options={THEMES}
          clearable={false}
        />
      </div>
    </SettingsCard>
  );
}
