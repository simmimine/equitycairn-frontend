import { describe, expect, it, vi } from "vitest";

const insert = vi.fn();
const from = vi.fn(() => ({ insert }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({ from }),
}));

import { insertBugReport } from "./store";

const REPORT = {
  whatHappened: "x",
  expected: null,
  pagePath: "/feed",
  browser: "Firefox",
  screen: "390x844",
};

describe("insertBugReport", () => {
  it("writes the report for the user", async () => {
    insert.mockResolvedValue({ error: null });
    await insertBugReport("u1", REPORT);
    expect(from).toHaveBeenCalledWith("bug_reports");
    expect(insert).toHaveBeenCalledWith({
      user_id: "u1",
      what_happened: "x",
      expected: null,
      page_path: "/feed",
      browser: "Firefox",
      screen: "390x844",
    });
  });

  it("throws when the write fails", async () => {
    insert.mockResolvedValue({ error: { message: "down" } });
    await expect(insertBugReport("u1", REPORT)).rejects.toThrow();
  });
});
