import { SettingsCard } from "./parts";

/** A placeholder: no controls until plans and payments are decided. */
export function SubscriptionSection() {
  return (
    <SettingsCard id="subscription" title="Subscription">
      <p className="rounded-[10px] bg-secondary px-4 py-4 text-center text-[0.8125rem] font-semibold">
        Subscriptions are coming soon.
      </p>
    </SettingsCard>
  );
}
