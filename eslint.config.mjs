import baseConfig from "eslint-config-executable-stories";

export default [
  ...baseConfig,
  {
    rules: {
      // Ban dynamic import() - use static imports for predictable bundling and tree-shaking
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportExpression",
          message: "Dynamic import() is not allowed. Use static import instead.",
        },
      ],
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
    files: ["**/login.story.spec.ts", "**/vitest.config.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  // Reporter conditionally loads @actions/core (dynamic import required)
  {
    files: ["**/reporter.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
];
