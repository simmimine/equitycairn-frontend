import { beforeEach, describe, expect, it, vi } from "vitest";

const order: string[] = [];
const updateUserById = vi.fn();
const rpc = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({ rpc, auth: { admin: { updateUserById } } }),
}));

import { deleteAccount, setPassword } from "./admin";

beforeEach(() => {
  order.length = 0;
  updateUserById.mockReset().mockImplementation(async () => {
    order.push("update");
    return { error: null };
  });
  rpc.mockReset().mockImplementation(async (fn: string) => {
    order.push(fn);
    return { error: null };
  });
});

describe("setPassword", () => {
  it("ends every session before and after changing the password", async () => {
    await setPassword("u1", "a new long password");
    expect(updateUserById).toHaveBeenCalledWith("u1", {
      password: "a new long password",
    });
    expect(rpc).toHaveBeenCalledWith("end_user_sessions", { p_user_id: "u1" });
    expect(order).toEqual(["end_user_sessions", "update", "end_user_sessions"]);
  });

  it("leaves the password alone when sessions cannot be ended", async () => {
    rpc.mockResolvedValue({ error: { message: "permission denied" } });
    await expect(setPassword("u1", "pw")).rejects.toThrow();
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("throws when the update fails", async () => {
    updateUserById.mockResolvedValue({ error: { message: "nope" } });
    await expect(setPassword("u1", "pw")).rejects.toThrow();
  });
});

describe("deleteAccount", () => {
  it("deletes through the single database function", async () => {
    await deleteAccount("u1");
    expect(rpc).toHaveBeenCalledWith("delete_account", { p_user_id: "u1" });
  });

  it("throws on failure", async () => {
    rpc.mockResolvedValue({ error: { message: "nope" } });
    await expect(deleteAccount("u1")).rejects.toThrow();
  });
});
