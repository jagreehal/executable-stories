import { defineConfig } from "@playwright/test";

/**
 * Dedicated config for generating the docs-site marketing screenshots from the
 * REAL React-rendered report (executable-stories-react). Kept separate from the
 * default e2e config (which only matches *.story.spec.ts) so these never run in
 * CI / `pnpm test` — they're an on-demand asset build: `pnpm screenshots`.
 *
 * deviceScaleFactor: 2 → Retina-quality PNGs.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "capture.spec.ts",
  // Generation is destructive (writes PNGs); never allow .only and don't retry.
  retries: 0,
  workers: 1,
  timeout: 120_000,
  use: {
    browserName: "chromium",
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  },
});
