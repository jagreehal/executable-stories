import rootConfig from "../../eslint.config.mjs";

export default [
  ...rootConfig,
  {
    ignores: ["dist/**", "**/__tests__/**", "**/fixtures/**"],
  },
  // In vitest.config, do not import StoryReporter from main entry; use vitest-executable-stories/reporter
  {
    files: ["**/vitest.config.*", "vitest.config.*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "vitest-executable-stories",
              importNames: ["StoryReporter", "default"],
              message:
                'In vitest.config, import StoryReporter from "vitest-executable-stories/reporter".',
            },
          ],
        },
      ],
    },
  },
];
