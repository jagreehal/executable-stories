/**
 * Playwright config with playwright-executable-stories reporter (colocated .story.docs.md next to spec files).
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const reporterPath = require.resolve("playwright-executable-stories/reporter");

export default defineConfig({
  testDir: __dirname,
  testMatch: "**/*.story.spec.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    [
      reporterPath,
      {
        output: [{ include: "**/*", mode: "colocated" }],
        enableGithubActionsSummary: false,
      },
    ],
  ],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3000",
    video: "on",
  },
});
