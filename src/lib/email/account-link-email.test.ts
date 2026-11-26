import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendAccountLinkEmail } from "./account-link-email";

const ADDRESS = "person@example.com";
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("SITE_URL", "https://app.example.com/");
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendAccountLinkEmail", () => {
  it.each([
    ["password_change", "Change your EquityCairn password"],
    ["account_delete", "Confirm deleting your EquityCairn account"],
  ] as const)("sends the %s link", async (purpose, subject) => {
    await expect(sendAccountLinkEmail(ADDRESS, purpose, "tok")).resolves.toBe(
      true,
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const link = "https://app.example.com/account/confirm?token=tok";
    expect(body.to).toEqual([ADDRESS]);
    expect(body.subject).toBe(subject);
    expect(body.text).toContain(link);
    expect(body.html).toContain(link);
    expect(body.text).toContain("30 minutes");
    expect(body.text).toContain(
      "If you didn't ask for this, ignore this email.",
    );
  });

  it("sends nothing in production without SITE_URL", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SITE_URL", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      sendAccountLinkEmail(ADDRESS, "password_change", "tok"),
    ).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
