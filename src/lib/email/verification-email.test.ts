import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendVerificationEmail } from "./verification-email";

const ADDRESS = "person@example.com";
const TOKEN = "tok_SECRET-value_123";
const KEY = "re_test_key_not_real";
const ENV_KEYS = ["RESEND_API_KEY", "EMAIL_FROM", "SITE_URL"] as const;

const saved: Record<string, string | undefined> = {};
const fetchMock = vi.fn();
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  process.env.RESEND_API_KEY = KEY;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
  errorSpy.mockRestore();
});

function loggedText() {
  return errorSpy.mock.calls
    .flat()
    .map((a: unknown) => (a instanceof Error ? a.message : String(a)))
    .join(" ");
}

function expectNoLeak() {
  const out = loggedText();
  expect(out).not.toContain(ADDRESS);
  expect(out).not.toContain(TOKEN);
  expect(out).not.toContain(KEY);
  expect(out).not.toContain("join-beta/verify");
}

describe("sendVerificationEmail", () => {
  it("posts to Resend with defaults and returns true on 200", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    await expect(sendVerificationEmail(ADDRESS, TOKEN)).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(`Bearer ${KEY}`);
    const body = JSON.parse(init.body);
    const link = `http://localhost:3000/join-beta/verify?token=${TOKEN}`;
    expect(body.from).toBe("EquityCairn <onboarding@resend.dev>");
    expect(body.to).toEqual([ADDRESS]);
    expect(body.subject).toBe("Confirm your EquityCairn beta sign-up");
    expect(body.text).toContain(link);
    expect(body.html).toContain(link);
  });

  it("uses EMAIL_FROM and SITE_URL, ignoring a trailing slash", async () => {
    process.env.EMAIL_FROM = "Cairn <hi@example.org>";
    process.env.SITE_URL = "https://example.org/";
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    await sendVerificationEmail(ADDRESS, TOKEN);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.from).toBe("Cairn <hi@example.org>");
    expect(body.text).toContain(
      `https://example.org/join-beta/verify?token=${TOKEN}`,
    );
  });

  it("returns false on a 422 without leaking details", async () => {
    fetchMock.mockResolvedValue(
      new Response(`bad ${ADDRESS} ${TOKEN}`, { status: 422 }),
    );
    await expect(sendVerificationEmail(ADDRESS, TOKEN)).resolves.toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    expect(loggedText()).toContain("422");
    expectNoLeak();
  });

  it("returns false when fetch rejects, without leaking details", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    await expect(sendVerificationEmail(ADDRESS, TOKEN)).resolves.toBe(false);
    expect(loggedText()).toContain("network down");
    expectNoLeak();
  });

  it("passes an abort signal to fetch", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    await sendVerificationEmail(ADDRESS, TOKEN);
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("returns false on a timeout without leaking details", async () => {
    fetchMock.mockRejectedValue(
      new DOMException("The operation timed out.", "TimeoutError"),
    );
    await expect(sendVerificationEmail(ADDRESS, TOKEN)).resolves.toBe(false);
    expect(loggedText()).toContain("timed out");
    expectNoLeak();
  });

  it("HTML-escapes the link in the html body only", async () => {
    process.env.SITE_URL = 'https://example.org/a"b&c';
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    await sendVerificationEmail(ADDRESS, TOKEN);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const raw = `https://example.org/a"b&c/join-beta/verify?token=${TOKEN}`;
    expect(body.text).toContain(raw);
    expect(body.html).not.toContain('a"b');
    expect(body.html).toContain(
      `href="https://example.org/a&quot;b&amp;c/join-beta/verify?token=${TOKEN}"`,
    );
  });

  it("returns false without calling fetch when the API key is unset", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendVerificationEmail(ADDRESS, TOKEN)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    expectNoLeak();
  });
});
