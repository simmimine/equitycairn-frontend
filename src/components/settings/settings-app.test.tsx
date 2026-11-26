import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { stubMatchMedia, stubResizeObserver } from "@/test-utils/dom-stubs";

const setTheme = vi.fn();
let theme = "system";
vi.mock("next-themes", () => ({
  useTheme: () => ({ theme, setTheme }),
}));

import { SettingsApp, type SettingsActions } from "./settings-app";

const EMAIL = "ann@example.com";
const actions = {
  saveProfile: vi.fn(),
  requestLink: vi.fn(),
  reportBug: vi.fn(),
  signOut: vi.fn(),
  signOutEverywhere: vi.fn(),
} satisfies SettingsActions;

function show(props: Partial<React.ComponentProps<typeof SettingsApp>> = {}) {
  render(
    <SettingsApp
      profile={{
        firstName: "Ann",
        lastName: "Lee",
        role: "other",
        experience: null,
      }}
      email={EMAIL}
      supportEmail="help@example.com"
      fromPath="/feed"
      actions={actions}
      {...props}
    />,
  );
  return userEvent.setup();
}

const section = (name: string) => screen.getByRole("region", { name });
const button = (name: string) => screen.getByRole("button", { name });

beforeEach(() => {
  stubMatchMedia();
  stubResizeObserver();
  vi.clearAllMocks();
  actions.saveProfile.mockResolvedValue({ ok: true });
  actions.requestLink.mockResolvedValue({ ok: true, email: EMAIL });
  actions.reportBug.mockResolvedValue({ ok: true });
});

describe("SettingsApp", () => {
  it("shows the six sections in order, with links to each", () => {
    show();
    const titles = [
      "Profile",
      "Appearance",
      "Account and security",
      "Subscription",
      "Report a bug",
      "Privacy and help",
    ];
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual(titles);
    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    for (const [i, link] of within(nav).getAllByRole("link").entries()) {
      expect(link).toHaveTextContent(titles[i]);
      const target = link.getAttribute("href")!.slice(1);
      expect(document.getElementById(target)).toBe(section(titles[i]));
    }
  });
});

describe("profile", () => {
  it("is pre-filled and saves what is chosen", async () => {
    const user = show();
    const first = screen.getByLabelText("First name");
    expect(first).toHaveValue("Ann");
    expect(screen.getByLabelText("Last name")).toHaveValue("Lee");
    expect(screen.getByRole("radio", { name: "Other" })).toBeChecked();
    expect(
      screen.getAllByRole("radio", { name: "Prefer not to say" }),
    ).toHaveLength(2);
    await user.clear(first);
    await user.type(first, "Anna");
    await user.click(screen.getByRole("radio", { name: "Beginner" }));
    await user.click(button("Save changes"));
    expect(actions.saveProfile).toHaveBeenCalledWith({
      firstName: "Anna",
      lastName: "Lee",
      role: "other",
      experience: "beginner",
    });
    expect(await screen.findByText("Changes saved.")).toBeInTheDocument();
  });

  it("marks the chosen answer with a border and fill, as on the boards", () => {
    show();
    const card = screen
      .getByRole("radio", { name: "Other" })
      .closest("[data-slot=field-label]");
    expect(card).toHaveClass(
      "has-data-checked:border-primary",
      "has-data-checked:bg-secondary",
    );
  });

  it("explains a rejected name", async () => {
    actions.saveProfile.mockResolvedValue({ ok: false, error: "invalid" });
    const user = show();
    await user.click(button("Save changes"));
    expect(await screen.findByText(/use letters, spaces/i)).toBeInTheDocument();
  });
});

describe("appearance", () => {
  it.each([
    ["Light", "system"],
    ["Dark", "system"],
    ["System", "light"],
  ])("chooses %s", async (name, before) => {
    theme = before;
    const user = show();
    await user.click(
      within(section("Appearance")).getByRole("radio", { name }),
    );
    expect(setTheme).toHaveBeenCalledWith(name.toLowerCase());
  });
});

describe("account and security", () => {
  it("shows the email read-only", () => {
    show();
    const email = screen.getByLabelText("Email");
    expect(email).toHaveValue(EMAIL);
    expect(email).toHaveAttribute("readonly");
  });

  it.each([
    ["Change password", "password_change"],
    ["Delete account", "account_delete"],
  ])("emails a link for %s", async (name, purpose) => {
    const user = show();
    await user.click(button(name));
    expect(actions.requestLink).toHaveBeenCalledWith(purpose);
    expect(
      await screen.findByText(
        `We sent a link to ${EMAIL}. It lasts 30 minutes.`,
      ),
    ).toBeInTheDocument();
  });

  it.each([
    ["send_failed", "We couldn't send the email. Please try again."],
    ["rate_limited", "Too many requests. Please wait a few minutes."],
  ])("explains %s", async (error, text) => {
    actions.requestLink.mockResolvedValue({ ok: false, error });
    const user = show();
    await user.click(button("Change password"));
    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  it("signs out here or everywhere", async () => {
    const user = show();
    await user.click(button("Sign out"));
    expect(actions.signOut).toHaveBeenCalledTimes(1);
    expect(actions.signOutEverywhere).not.toHaveBeenCalled();
    await user.click(button("Sign out of all devices"));
    expect(actions.signOutEverywhere).toHaveBeenCalledTimes(1);
  });
});

describe("subscription", () => {
  it("only says it is coming", () => {
    show();
    const s = section("Subscription");
    expect(
      within(s).getByText("Subscriptions are coming soon."),
    ).toBeInTheDocument();
    for (const role of ["button", "link", "textbox"]) {
      expect(within(s).queryByRole(role)).not.toBeInTheDocument();
    }
  });
});

describe("report a bug", () => {
  it("says what is attached and sends it, then clears", async () => {
    const user = show();
    expect(
      screen.getByText(
        "We attach the page you came from, your browser and your screen size.",
      ),
    ).toBeInTheDocument();
    const what = screen.getByLabelText("What happened?");
    await user.type(what, "It broke");
    await user.click(button("Send report"));
    expect(actions.reportBug).toHaveBeenCalledWith({
      whatHappened: "It broke",
      expected: "",
      pagePath: "/feed",
      browser: navigator.userAgent,
      screen: `${window.innerWidth}x${window.innerHeight}`,
    });
    expect(
      await screen.findByText("Thanks, your report was sent."),
    ).toBeInTheDocument();
    expect(what).toHaveValue("");
  });

  it.each([
    ["server_error", "Something went wrong, please try again."],
    ["rate_limited", "Too many reports. Please try again later."],
    ["invalid", "Tell us what happened, in 2000 characters or fewer."],
  ])("keeps the text on %s", async (error, text) => {
    actions.reportBug.mockResolvedValue({ ok: false, error });
    const user = show();
    await user.type(screen.getByLabelText("What happened?"), "It broke");
    await user.click(button("Send report"));
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(screen.getByLabelText("What happened?")).toHaveValue("It broke");
  });
});

describe("an ended session", () => {
  it.each([
    ["Save changes", "saveProfile"],
    ["Change password", "requestLink"],
    ["Send report", "reportBug"],
  ] as const)(
    "is explained after %s, keeping typed text",
    async (name, key) => {
      actions[key].mockResolvedValue({ ok: false, error: "unauthenticated" });
      const user = show();
      await user.type(screen.getByLabelText("What happened?"), "typed");
      await user.click(button(name));
      expect(
        await screen.findByText(/your session has ended/i),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
        "href",
        "/login",
      );
      expect(screen.getByLabelText("What happened?")).toHaveValue("typed");
    },
  );
});

describe("privacy and help", () => {
  it("lists what is stored and offers support", () => {
    show();
    const s = section("Privacy and help");
    expect(s).toHaveTextContent(
      "We store your name, email, role, experience, watchlist and bug reports.",
    );
    expect(s).toHaveTextContent("EquityCairn does not give investment advice.");
    expect(
      within(s).getByRole("link", { name: "help@example.com" }),
    ).toHaveAttribute("href", "mailto:help@example.com");
  });

  it("hides the support line without an address", () => {
    show({ supportEmail: null });
    expect(screen.queryByText(/contact support/i)).not.toBeInTheDocument();
  });
});
