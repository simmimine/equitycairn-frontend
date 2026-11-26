export type SettingEntry = {
  /** DOM id of the setting's control, or of its section. */
  id: string;
  title: string;
  section: string;
  /** Other words a person might type for it. */
  also?: string;
};

const entry = (
  section: string,
  id: string,
  title: string,
  also?: string,
): SettingEntry => ({ id, title, section, also });

const ACCOUNT = "Account and security";

export const SETTINGS: readonly SettingEntry[] = [
  entry("Profile", "setting-first-name", "First name"),
  entry("Profile", "setting-last-name", "Last name"),
  entry("Profile", "setting-role", "Role"),
  entry("Profile", "setting-experience", "Experience"),
  entry("Appearance", "setting-theme", "Theme", "light dark system mode"),
  entry(ACCOUNT, "setting-email", "Email"),
  entry(ACCOUNT, "setting-password", "Change password"),
  entry(ACCOUNT, "setting-sign-out", "Sign out", "log out"),
  entry(ACCOUNT, "setting-sign-out-all", "Sign out of all devices", "log out"),
  entry(ACCOUNT, "setting-delete", "Delete account", "remove"),
  entry("Subscription", "subscription", "Subscription", "plan billing"),
  entry("Report a bug", "setting-bug", "Report a bug", "problem feedback"),
  entry("Privacy and help", "privacy", "Privacy and help", "support data"),
];

export function searchSettings(query: string): SettingEntry[] {
  const wanted = query.trim().toLowerCase();
  if (!wanted) return [];
  return SETTINGS.filter(({ title, section, also }) =>
    [title, section, also ?? ""].some((text) =>
      text.toLowerCase().includes(wanted),
    ),
  );
}
