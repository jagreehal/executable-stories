/**
 * Fixture config for mixed output mode test.
 * - features/** → colocated
 * - e2e/** → aggregated to dist/e2e-stories.md
 * - other/** → default aggregated (dist/other-stories.md via catch-all)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: __dirname,
  testMatch: "**/*.story.spec.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    [
      path.join(__dirname, "..", "..", "..", "..", "..", "dist", "reporter.js"),
      {
        output: [
          { include: "**/features/**", mode: "colocated", extension: ".docs.md" },
          { include: "**/e2e/**", mode: "aggregated", outputFile: path.join(__dirname, "dist", "e2e-stories.md") },
          { include: "**/*", mode: "aggregated", outputFile: path.join(__dirname, "dist", "other-stories.md") },
        ],
        enableGithubActionsSummary: false,
      },
    ],
  ],
});
