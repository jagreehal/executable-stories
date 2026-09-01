import { defineConfig } from "@playwright/test";
import { CHROME_FLAGS, requireChrome } from "./src/chrome";

/**
 * The WebMCP native lane.
 *
 * The default suite drives a `document.modelContext` test double on bundled
 * Chromium, which is what lets it run anywhere with no browser flag. This
 * config drives a real Chrome with WebMCP switched on, so the double can be
 * checked rather than trusted. On demand only:
 *
 *   pnpm test:webmcp:native
 *
 * `.contract.ts` rather than `.story.spec.ts` keeps these files out of the
 * default run, which has no browser that could pass them.
 */
export default defineConfig({
  testDir: "./src",
  testMatch: "**/*.contract.ts",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  reporter: [["list"]],
  use: {
    launchOptions: {
      executablePath: requireChrome(),
      args: CHROME_FLAGS,
    },
  },
});
