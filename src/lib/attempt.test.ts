import { UnrecognizedActionError } from "next/dist/client/components/unrecognized-action-error";
import { redirect } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { attempt } from "./attempt";

const reload = vi.fn();
const FAILED = { ok: false, error: "server_error" };

describe("attempt", () => {
  beforeEach(() => {
    reload.mockReset();
    vi.stubGlobal("location", { reload });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("passes the action's result through", async () => {
    expect(await attempt(async () => ({ ok: true }))).toEqual({ ok: true });
  });

  it("turns an unreachable action into a result and logs only its name", async () => {
    const result = await attempt(async () => {
      throw new TypeError("secret@example.com");
    });
    expect(result).toEqual(FAILED);
    expect(console.error).toHaveBeenCalledWith("action failed:", "TypeError");
    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads a tab left over from an older deployment", async () => {
    await attempt(async () => {
      throw new UnrecognizedActionError("gone");
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("lets a redirect through", async () => {
    await expect(attempt(async () => redirect("/feed"))).rejects.toThrow(
      "NEXT_REDIRECT",
    );
  });
});
