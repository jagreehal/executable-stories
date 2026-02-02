import type { ESLint, Linter } from "eslint";
import requireStoryContextForSteps from "./rules/require-story-context-for-steps.js";
import requireTestContextForDocStory from "./rules/require-test-context-for-doc-story.js";

const rules = {
  "require-story-context-for-steps": requireStoryContextForSteps,
  "require-test-context-for-doc-story": requireTestContextForDocStory,
};

const configs: Record<string, Linter.Config[]> = {
  recommended: [
    {
      plugins: {
        "playwright-executable-stories": { rules },
      },
      rules: {
        "playwright-executable-stories/require-story-context-for-steps": "error",
        "playwright-executable-stories/require-test-context-for-doc-story": "error",
      },
    },
  ],
};

const plugin: ESLint.Plugin = {
  meta: {
    name: "eslint-plugin-playwright-executable-stories",
    version: "0.1.0",
  },
  rules,
  configs,
};

export default plugin;
export { rules, configs };
