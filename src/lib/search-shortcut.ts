import { useSyncExternalStore } from "react";

/** True for Ctrl+K or ⌘K, on any keyboard layout. */
export function isSearchShortcut(event: KeyboardEvent) {
  if (!(event.metaKey || event.ctrlKey)) return false;
  if (event.altKey || event.shiftKey) return false;
  // A Latin layout names the letter (Dvorak's K key types T). A layout in
  // another script gives a letter of its own, so go by the key's place,
  // where QWERTY has K.
  if (/^[a-z]$/i.test(event.key)) return event.key.toLowerCase() === "k";
  return /^\p{L}$/u.test(event.key) && event.code === "KeyK";
}

// The platform never changes, so there is nothing to subscribe to.
const noChanges = () => () => {};
const shortcutHint = () =>
  /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "⌘ K" : "Ctrl K";
// The server cannot know the platform: no hint until hydrated, so the
// server and first client render agree.
const noHint = () => null;

/** The shortcut as this platform writes it; null before hydration. */
export function useShortcutHint(): string | null {
  return useSyncExternalStore(noChanges, shortcutHint, noHint);
}
