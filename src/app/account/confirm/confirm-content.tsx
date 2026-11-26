import { connection } from "next/server";

import {
  confirmAccountDeletion,
  confirmPasswordChange,
} from "@/app/actions/account-link";
import {
  ConfirmView,
  InvalidLinkScreen,
} from "@/components/account/confirm-view";
import { peekLink } from "@/lib/account/links";

type Params = { token?: string | string[] };

// 32 random bytes in base64url.
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

// Rendering only looks the link up: nothing changes and the link is not used up
// until the form is submitted, so link scanners that open it do nothing.
export async function ConfirmContent({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const { token } = await searchParams;
  if (typeof token !== "string" || !TOKEN.test(token)) {
    return <InvalidLinkScreen />;
  }
  // The lookup reads the clock: wait for the real request, or Next's prerender
  // validation rejects it.
  await connection();
  const link = await peekLink(token);
  // The same element for a live and a dead link, so a redraw after the link is
  // used keeps the view's state (see ConfirmView).
  return (
    <ConfirmView
      key={token}
      purpose={link?.purpose ?? null}
      token={token}
      changePassword={confirmPasswordChange}
      deleteAccount={confirmAccountDeletion}
    />
  );
}
