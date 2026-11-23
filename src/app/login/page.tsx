import type { Metadata } from "next";

import { JoinBetaShell } from "@/components/join-beta/join-beta-shell";
import { LoginFlow } from "@/components/login/login-flow";

export const metadata: Metadata = {
  title: "Log in | EquityCairn",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <JoinBetaShell>
      <LoginFlow />
    </JoinBetaShell>
  );
}
