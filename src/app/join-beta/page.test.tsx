import { cleanup, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSignupStatus, resendVerification } = vi.hoisted(() => ({
  getSignupStatus: vi.fn(),
  resendVerification: vi.fn(),
}));
vi.mock("@/lib/signup/store", () => ({ getSignupStatus }));
vi.mock("@/app/actions/resend-verification", () => ({ resendVerification }));

import { JoinBetaContent } from "./join-beta-content";
import JoinBetaPage, { metadata } from "./page";

const TOKEN = "A".repeat(43);

async function renderPage(token: string | string[] | undefined) {
  const ui = await JoinBetaContent({
    searchParams: Promise.resolve({ token }),
  });
  return render(ui);
}

describe("/join-beta", () => {
  beforeEach(() => {
    getSignupStatus.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("wraps the request-time content in Suspense (cacheComponents)", () => {
    const element = JoinBetaPage({ searchParams: Promise.resolve({}) });
    expect(element.type).toBe(Suspense);
  });

  it("is not indexable", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("shows Check your email with the server cooldown for a valid token", async () => {
    getSignupStatus.mockResolvedValue({ cooldownRemainingSeconds: 42 });
    await renderPage(TOKEN);
    expect(getSignupStatus).toHaveBeenCalledWith(TOKEN);
    expect(
      screen.getByRole("heading", { name: "Check your email" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Re-send available in 0:42/ }),
    ).toBeDisabled();
  });

  it("never mentions an email address or the word verified", async () => {
    getSignupStatus.mockResolvedValue({ cooldownRemainingSeconds: 0 });
    const { container } = await renderPage(TOKEN);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/verified/i);
    expect(text).not.toMatch(/@/);
  });

  it("shows the invalid state for an unknown token", async () => {
    getSignupStatus.mockResolvedValue(null);
    await renderPage(TOKEN);
    expectInvalid();
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["array", [TOKEN, TOKEN]],
    ["over-long", "A".repeat(129)],
    ["malformed", "junk"],
  ])(
    "shows the invalid state without hitting the store for a %s token",
    async (_n, token) => {
      await renderPage(token);
      expectInvalid();
      expect(getSignupStatus).not.toHaveBeenCalled();
    },
  );

  it("shows a generic error if the store throws, without logging the token", async () => {
    getSignupStatus.mockRejectedValue(new Error("db down"));
    await renderPage(TOKEN);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      TOKEN,
    );
  });
});

function expectInvalid() {
  expect(
    screen.getByRole("heading", { name: "This link isn't valid" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  const links = screen.getAllByRole("link");
  expect(
    links.some(
      (l) =>
        l.getAttribute("href") === "/" && /home/i.test(l.textContent ?? ""),
    ),
  ).toBe(true);
}
