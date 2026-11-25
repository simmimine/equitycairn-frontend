import { AuthCard } from "@/components/join-beta/auth-card";
import { JoinBetaShell } from "@/components/join-beta/join-beta-shell";
import { ConfirmForm } from "@/components/login/confirm-form";

export function ConfirmScreen(props: React.ComponentProps<typeof ConfirmForm>) {
  return (
    <JoinBetaShell>
      <AuthCard
        title="Confirm your account"
        description="One last step to make sure it's you."
      >
        <ConfirmForm {...props} />
      </AuthCard>
    </JoinBetaShell>
  );
}
