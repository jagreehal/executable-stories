import baseConfig from "eslint-config-executable-stories";

export default [
  ...baseConfig,
  // Build output and generated code are not source: they are rewritten on every
  // build and nobody can act on a finding in them. The base config's "dist/**"
  // is relative to this file, so it misses every package's own dist.
  {
    ignores: [
      "**/dist/**",
      "**/storybook-static/**",
      "**/.turbo/**",
      "**/.astro/**",
      "**/src/generated/**",
      // Scaffolding shipped to users, run in their project, not built here.
      "**/templates/**",
    ],
  },
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
  // Tests and config are consumers of a package, not internals of it: importing
  // the entry point is exactly what a consumer does. The no-barrels rule is for
  // source reaching sideways through a barrel. Must come after the main rules.
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/test/**",
      "**/tests/**",
      "**/__tests__/**",
      "**/*.config.ts",
      "**/*.config.mts",
      "**/.storybook/**",
    ],
    rules: { "no-restricted-imports": "off" },
  },
  // Dynamic import allowed: reporter (optional @actions/core), error-handling tests (isolated module load)
  {
    files: ["**/reporter.ts", "**/__tests__/error-handling.test.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
];
