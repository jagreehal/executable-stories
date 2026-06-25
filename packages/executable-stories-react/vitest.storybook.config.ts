import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/**
 * COMPONENT TIER (Level 3) runner. Runs every story — smoke render + play
 * functions + a11y — in a real headless Chromium via Playwright. Kept separate
 * from vitest.config so the fast node tier (`pnpm test`) needs no browser.
 *   pnpm test:component
 */
export default defineConfig({
  plugins: [storybookTest({ configDir: ".storybook" })],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // Pre-bundle the deps Storybook pulls in so Vite doesn't re-optimize (and
  // reload) mid-run, which flakes the first headless pass.
  optimizeDeps: {
    include: [
      "class-variance-authority",
      "clsx",
      "tailwind-merge",
      "marked",
      "mermaid",
      "storybook/test",
    ],
  },
  test: {
    name: "storybook",
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
  },
});
