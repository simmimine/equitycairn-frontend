import { connection } from "next/server";

import { VerifyResultView } from "@/components/join-beta/views";
import { parseTokenParam } from "@/lib/signup/search-token";
import { verifyEmail } from "@/lib/signup/store";

export async function VerifyContent({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const token = parseTokenParam((await searchParams).token);

  const invalid = <VerifyResultView result="invalid" />;
  if (!token) return invalid;

  // verifyEmail reads the clock and writes to the database: it must only run
  // for a real request, never while prerendering or prefetching this route.
  await connection();

  let result;
  try {
    result = await verifyEmail(token);
  } catch {
    console.error("verify page: verification failed");
    return <VerifyResultView result="error" />;
  }

  return <VerifyResultView result={result} />;
}
