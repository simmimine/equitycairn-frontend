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
  const link = await peekLink(token);
  if (!link) return <InvalidLinkScreen />;
  return (
    <ConfirmView
      purpose={link.purpose}
      token={token}
      changePassword={confirmPasswordChange}
      deleteAccount={confirmAccountDeletion}
    />
  );
}
