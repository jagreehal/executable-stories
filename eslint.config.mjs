import baseConfig from "eslint-config-executable-stories";

export default [
  ...baseConfig,
  {
    rules: {
      // No barrel imports - import from concrete files for better tree-shaking
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/index", "**/index.js", "**/index.ts"],
              message: "Barrel (index) imports are not allowed. Import from the concrete module file.",
            },
          ],
        },
      ],
    },
  },
  // Allow package entry / config imports from index (no-barrels exception) - must be after main rules
  {
    files: [
      "**/login.story.spec.ts",
      "**/vitest.config.ts",
      "**/__tests__/story-api.test.ts",
    ],
    rules: { "no-restricted-imports": "off" },
  },
  // Dynamic import allowed: reporter (optional @actions/core), error-handling tests (isolated module load)
  {
    files: ["**/reporter.ts", "**/__tests__/error-handling.test.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
];
