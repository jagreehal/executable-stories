/**
 * Level 4 (executable story) config for the docs site. Drives the PRODUCTION
 * build via `astro preview` (not dev — no dev toolbar in screenshots), runs the
 * `*.story.spec.ts` journeys, and emits living docs through the
 * executable-stories-playwright reporter (docs/e2e-stories.*). Kept out of
 * `pnpm quality` because pixel snapshots are baseline/OS-sensitive — run with
 * `pnpm --filter astro-example test:e2e`.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const reporterPath = require.resolve("executable-stories-playwright/reporter");

export default defineConfig({
  testDir: path.join(__dirname, "e2e"),
  testMatch: "**/*.story.spec.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  // Web fonts + tints make tiny anti-aliasing diffs; allow a small ratio.
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02 } },
  reporter: [
    ["list"],
    [reporterPath, { formats: ["markdown", "html"], outputDir: "docs", outputName: "e2e-stories" }],
  ],
  use: {
    baseURL: "http://localhost:4321",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm preview --port 4321",
    url: "http://localhost:4321",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
