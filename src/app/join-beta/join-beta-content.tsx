import { connection } from "next/server";

import { LinkScreen } from "@/components/join-beta/link-screen";
import { BetaCheckEmail } from "@/components/join-beta/views";
import { parseTokenParam } from "@/lib/signup/search-token";
import { getSignupStatus } from "@/lib/signup/store";

export async function JoinBetaContent({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const token = parseTokenParam((await searchParams).token);

  const invalid = (
    <LinkScreen
      title="This link isn't valid"
      description="Head back to the home page to join the beta."
      href="/"
      action="Back to home"
    />
  );
  if (!token) return invalid;

  // getSignupStatus reads the clock (cooldown countdown): request time only.
  await connection();

  let status;
  try {
    status = await getSignupStatus(token);
  } catch {
    console.error("join-beta page: status lookup failed");
    return (
      <LinkScreen
        title="Something went wrong"
        description="Please try again in a moment."
        href="/"
        action="Back to home"
      />
    );
  }
  if (!status) return invalid;

  return (
    <BetaCheckEmail
      token={token}
      cooldownSeconds={status.cooldownRemainingSeconds}
    />
  );
}
