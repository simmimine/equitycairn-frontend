import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { stubMatchMedia, stubResizeObserver } from "@/test-utils/dom-stubs";
import { SETTINGS } from "@/lib/settings/search";

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "system", setTheme: vi.fn() }),
}));

import { SettingsApp } from "./settings-app";

const actions = {
  saveProfile: vi.fn(),
  requestLink: vi.fn(),
  reportBug: vi.fn(),
  signOut: vi.fn(),
  signOutEverywhere: vi.fn(),
};
const DESKTOP = "(min-width: 48rem)";

function show(desktop = true) {
  stubMatchMedia({ [DESKTOP]: desktop });
  render(
    <SettingsApp
      profile={{
        firstName: "Ann",
        lastName: "Lee",
        role: null,
        experience: null,
      }}
      email="ann@example.com"
      supportEmail={null}
      fromPath={null}
      actions={actions}
    />,
  );
  return userEvent.setup();
}

const field = () => screen.getByRole("combobox", { name: "Search settings" });
const options = () => screen.queryAllByRole("option");
const shortcut = (init: KeyboardEventInit) =>
  fireEvent.keyDown(window, { key: "k", code: "KeyK", ...init });

beforeEach(() => {
  stubResizeObserver();
  vi.clearAllMocks();
});

describe("settings search", () => {
  it("can reach every listed setting", () => {
    show();
    for (const { id } of SETTINGS) {
      expect(document.querySelectorAll(`#${id}`)).toHaveLength(1);
    }
  });

  it.each([{ ctrlKey: true }, { metaKey: true }])(
    "is focused by %o + K",
    (modifier) => {
      show();
      // False when the browser's own shortcut was prevented.
      expect(shortcut(modifier)).toBe(false);
      expect(field()).toHaveFocus();
    },
  );

  it("moves with the arrows and focuses the setting on Enter", async () => {
    const user = show();
    await user.type(field(), "sign");
    expect(options().map((o) => o.getAttribute("aria-selected"))).toEqual([
      "true",
      "false",
    ]);
    await user.keyboard("{ArrowDown}");
    expect(field()).toHaveAttribute("aria-activedescendant", options()[1].id);
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("button", { name: "Sign out of all devices" }),
    ).toHaveFocus();
    expect(options()).toHaveLength(0);
    expect(field()).toHaveValue("");
    expect(actions.signOutEverywhere).not.toHaveBeenCalled();
  });

  it.each([
    ["delete", "Delete account"],
    ["sign out", "Sign out"],
  ])("never presses the button it goes to (%s)", async (query, name) => {
    const user = show();
    await user.type(field(), query);
    await user.click(options()[0]);
    expect(screen.getByRole("button", { name })).toHaveFocus();
    expect(actions.requestLink).not.toHaveBeenCalled();
    expect(actions.signOut).not.toHaveBeenCalled();
  });

  it("closes and clears on Escape", async () => {
    const user = show();
    await user.type(field(), "sign");
    await user.keyboard("{Escape}");
    expect(options()).toHaveLength(0);
    expect(field()).toHaveValue("");
  });

  it("says when nothing matches", async () => {
    const user = show();
    await user.type(field(), "zzz");
    expect(screen.getByText("No settings match")).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(field()).toHaveValue("zzz");
  });

  it("has a close button in the phone's search row", async () => {
    const user = show(false);
    const toggle = screen.getByRole("button", { name: "Search" });
    await user.click(toggle);
    await user.type(field(), "sign");
    await user.click(screen.getByRole("button", { name: "Close search" }));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
    expect(field()).toHaveValue("");
  });

  it("opens a row on a phone, by button or shortcut", async () => {
    const user = show(false);
    const toggle = screen.getByRole("button", { name: "Search" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(field()).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    shortcut({ ctrlKey: true });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(field()).toHaveFocus();
  });
});
