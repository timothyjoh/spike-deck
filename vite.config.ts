/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    port: 5180,
  },
  preview: {
    port: 5180,
  },
  // Unit tests live in tests/. The e2e/ dir is Playwright-only and must NOT be
  // collected by vitest (its specs import @playwright/test, which throws under vitest).
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
