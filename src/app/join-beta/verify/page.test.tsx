import { cleanup, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { verifyEmail } = vi.hoisted(() => ({ verifyEmail: vi.fn() }));
vi.mock("@/lib/signup/store", () => ({ verifyEmail }));

import { VerifyContent } from "./verify-content";
import VerifyPage, { metadata } from "./page";

const TOKEN = "B".repeat(43);

async function renderPage(token: string | string[] | undefined) {
  const ui = await VerifyContent({ searchParams: Promise.resolve({ token }) });
  return render(ui);
}

describe("/join-beta/verify", () => {
  beforeEach(() => {
    verifyEmail.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("wraps the request-time content in Suspense (cacheComponents)", () => {
    const element = VerifyPage({ searchParams: Promise.resolve({}) });
    expect(element.type).toBe(Suspense);
  });

  it("is not indexable", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("shows success when verified", async () => {
    verifyEmail.mockResolvedValue("verified");
    await renderPage(TOKEN);
    expect(verifyEmail).toHaveBeenCalledWith(TOKEN);
    expect(
      screen.getByRole("heading", { name: "You're on the list" }),
    ).toBeInTheDocument();
  });

  it("shows already verified", async () => {
    verifyEmail.mockResolvedValue("already_verified");
    await renderPage(TOKEN);
    expect(
      screen.getByRole("heading", { name: "Already verified" }),
    ).toBeInTheDocument();
  });

  it("shows invalid or expired with a link to /#join", async () => {
    verifyEmail.mockResolvedValue("invalid");
    await renderPage(TOKEN);
    expectInvalid();
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["array", [TOKEN, TOKEN]],
    ["over-long", "B".repeat(129)],
    ["malformed", "junk"],
  ])(
    "shows invalid without hitting the store for a %s token",
    async (_n, token) => {
      await renderPage(token);
      expectInvalid();
      expect(verifyEmail).not.toHaveBeenCalled();
    },
  );

  it("shows a generic error if the store throws", async () => {
    verifyEmail.mockRejectedValue(new Error("db down"));
    await renderPage(TOKEN);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      TOKEN,
    );
  });
});

function expectInvalid() {
  expect(
    screen.getByRole("heading", {
      name: "This link is invalid or has expired",
    }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /join the beta/i })).toHaveAttribute(
    "href",
    "/#join",
  );
}
