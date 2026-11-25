import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  // Undoes src/test-utils/dom-stubs.ts, among others.
  vi.unstubAllGlobals();
});
