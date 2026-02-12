import { defineConfig } from "cypress";
import { registerExecutableStoriesPlugin } from "./dist/plugin.js";

export default defineConfig({
  e2e: {
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
    setupNodeEvents(on) {
      registerExecutableStoriesPlugin(on);
    },
  },
});
