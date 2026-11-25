import {
  unstable_isUnrecognizedActionError,
  unstable_rethrow,
} from "next/navigation";

/**
 * Runs a server action, turning a failure to reach it (offline, bad gateway)
 * into a result the form can show instead of a crash.
 */
export async function attempt<T>(action: () => Promise<T>) {
  try {
    return await action();
  } catch (err) {
    unstable_rethrow(err); // a successful action redirects by throwing
    // The tab predates the current deployment: retrying can never work.
    if (unstable_isUnrecognizedActionError(err)) window.location.reload();
    // The name only: messages may carry what the user typed.
    console.error(
      "action failed:",
      err instanceof Error ? err.name : "unknown",
    );
    return { ok: false, error: "server_error" } as const;
  }
}
