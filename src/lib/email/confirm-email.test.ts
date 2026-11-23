import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendConfirmEmail } from "./confirm-email";

const ADDRESS = "person+tag@example.com";
const HASH = "hash_SECRET/value=";
const fetchMock = vi.fn();
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.RESEND_API_KEY = "re_test";
  delete process.env.SITE_URL;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  errorSpy.mockRestore();
});

describe("sendConfirmEmail", () => {
  it("links to /auth/confirm with encoded token_hash and email", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    await expect(sendConfirmEmail(ADDRESS, HASH)).resolves.toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const link = `http://localhost:3000/auth/confirm?token_hash=${encodeURIComponent(HASH)}&email=${encodeURIComponent(ADDRESS)}`;
    expect(body.subject).toBe("Confirm your EquityCairn account");
    expect(body.to).toEqual([ADDRESS]);
    expect(body.text).toContain(link);
    expect(body.html).toContain(link.replace(/&/g, "&amp;"));
  });

  it("returns false on a non-2xx without leaking address or token", async () => {
    fetchMock.mockResolvedValue(
      new Response(`bad ${ADDRESS} ${HASH}`, { status: 500 }),
    );
    await expect(sendConfirmEmail(ADDRESS, HASH)).resolves.toBe(false);
    const out = errorSpy.mock.calls.flat().join(" ");
    expect(out).toContain("500");
    expect(out).not.toContain(ADDRESS);
    expect(out).not.toContain(HASH);
  });

  it("returns false without fetching when the API key is unset", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendConfirmEmail(ADDRESS, HASH)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
