import { TEXT_LINK } from "@/components/brand/styles";

import { SettingsCard } from "./parts";

export function PrivacySection({
  supportEmail,
}: {
  supportEmail: string | null;
}) {
  return (
    <SettingsCard id="privacy" title="Privacy and help">
      <div className="flex flex-col gap-2 text-xs text-muted-foreground">
        <p>
          We store your name, email, role, experience, watchlist and bug
          reports.
        </p>
        <p>EquityCairn does not give investment advice.</p>
        {supportEmail && (
          <p className="font-semibold">
            Contact support:{" "}
            <a href={`mailto:${supportEmail}`} className={TEXT_LINK}>
              {supportEmail}
            </a>
          </p>
        )}
      </div>
    </SettingsCard>
  );
}
