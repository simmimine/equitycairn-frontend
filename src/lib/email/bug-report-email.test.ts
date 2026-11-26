import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendBugReportEmail } from "./bug-report-email";

const fetchMock = vi.fn();
const REPORT = {
  whatHappened: "<script>alert(1)</script>",
  expected: "a <b>",
  pagePath: "/feed",
  browser: "Firefox",
  screen: "390x844",
};
const REPORTER = { id: "u1", email: "ann@example.com" };

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("BUG_REPORT_EMAIL", "owner@example.com");
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendBugReportEmail", () => {
  it("emails the owner with the text escaped", async () => {
    await expect(sendBugReportEmail(REPORT, REPORTER)).resolves.toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.to).toEqual(["owner@example.com"]);
    expect(body.subject).toBe("EquityCairn bug report");
    expect(body.html).not.toContain("<script>");
    expect(body.html).toContain("&lt;script&gt;");
    expect(body.text).toContain(REPORT.whatHappened);
    expect(body.text).toContain(REPORTER.email);
    expect(body.text).toContain("/feed");
  });

  it("sends nothing when BUG_REPORT_EMAIL is unset", async () => {
    vi.stubEnv("BUG_REPORT_EMAIL", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sendBugReportEmail(REPORT, REPORTER)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
