import type { ESLint, Linter } from "eslint";
import requireStoryContextForSteps from "./rules/require-story-context-for-steps.js";
import requireTestContextForDocStory from "./rules/require-test-context-for-doc-story.js";
import requireTaskForDocStory from "./rules/require-task-for-doc-story.js";

const rules = {
  "require-story-context-for-steps": requireStoryContextForSteps,
  "require-test-context-for-doc-story": requireTestContextForDocStory,
  "require-task-for-doc-story": requireTaskForDocStory,
};

const configs: Record<string, Linter.Config[]> = {
  recommended: [
    {
      plugins: {
        "vitest-executable-stories": { rules },
      },
      rules: {
        "vitest-executable-stories/require-story-context-for-steps": "error",
        "vitest-executable-stories/require-test-context-for-doc-story": "error",
        "vitest-executable-stories/require-task-for-doc-story": "error",
      },
    },
  ],
};

const plugin: ESLint.Plugin = {
  meta: {
    name: "eslint-plugin-vitest-executable-stories",
    version: "0.1.0",
  },
  rules,
  configs,
};

export default plugin;
export { rules, configs };
