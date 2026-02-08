/**
 * Cypress config with executable-stories-cypress plugin and reporter.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "cypress";
import { registerExecutableStoriesPlugin } from "executable-stories-cypress/plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  e2e: {
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.story.cy.ts",
    setupNodeEvents(on) {
      registerExecutableStoriesPlugin(on);
    },
  },
  reporter: "executable-stories-cypress/reporter.cjs",
  reporterOptions: {
    formats: ["markdown"],
    outputDir: path.join(__dirname, "docs"),
    outputName: "user-stories",
    output: { mode: "aggregated" },
    markdown: {
      title: "User Stories",
      includeStatusIcons: true,
      includeErrors: true,
      includeMetadata: true,
      sortScenarios: "source",
      suiteSeparator: " - ",
    },
  },
});
