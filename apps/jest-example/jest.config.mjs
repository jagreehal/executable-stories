/** Jest config with executable-stories-jest. */
export default {
  rootDir: process.cwd(),
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.story.test.ts'],
  setupFilesAfterEnv: ['executable-stories-jest/setup'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  reporters: [
    'default',
    [
      'executable-stories-jest/reporter',
      {
        // =================================================================
        // OUTPUT FORMAT SELECTION
        // =================================================================
        // Available formats: "markdown", "html", "junit", "cucumber-json"
        // Default: ["cucumber-json"]
        formats: ['markdown'],
        // formats: ["markdown", "html"],
        // formats: ["markdown", "html", "junit", "cucumber-json"],

        // =================================================================
        // OUTPUT LOCATION
        // =================================================================
        // Base directory for output files
        outputDir: 'docs',
        // outputDir: "reports",

        // Base filename (without extension)
        outputName: 'user-stories',
        // outputName: "test-results",

        // =================================================================
        // OUTPUT ROUTING
        // =================================================================
        output: {
          // Mode: "aggregated" (one file) or "colocated" (one per source)
          mode: 'aggregated',
          // mode: "colocated",

          // Colocated style (only when mode: "colocated"):
          // - "mirrored": mirror source structure under outputDir
          // - "adjacent": write next to source file (ignores outputDir)
          // colocatedStyle: "mirrored",
          // colocatedStyle: "adjacent",

          // Rule-based routing (first match wins)
          // rules: [
          //   { match: "**/*.story.test.ts", mode: "colocated", colocatedStyle: "adjacent" },
          //   { match: "e2e/**", mode: "aggregated", outputDir: "docs/e2e", outputName: "e2e-stories" },
          // ],
        },

        // =================================================================
        // MARKDOWN OPTIONS
        // =================================================================
        markdown: {
          // Report title
          title: 'User Stories',

          // Show status icons (✅ ❌ ⏩)
          includeStatusIcons: true,
          // includeStatusIcons: false,

          // Show failure details for failed tests
          includeErrors: true,
          // includeErrors: false,

          // Show metadata (date, version, git SHA)
          includeMetadata: true,
          // includeMetadata: false,

          // Scenario sort order: "source" (by line number) or "alpha" (alphabetical)
          sortScenarios: 'source',
          // sortScenarios: "alpha",

          // Separator for nested describe blocks
          suiteSeparator: ' - ',
          // suiteSeparator: " > ",
          // suiteSeparator: " / ",

          // Include YAML front-matter for machine parsing
          // includeFrontMatter: true,

          // Add summary statistics table
          // includeSummaryTable: true,

          // Base URL for source file permalinks (e.g., GitHub blob URL)
          // permalinkBaseUrl: "https://github.com/your-org/your-repo/blob/main/",

          // URL template for ticket links (use {ticket} placeholder)
          // ticketUrlTemplate: "https://jira.example.com/browse/{ticket}",
        },

        // =================================================================
        // HTML OPTIONS (when formats includes "html")
        // =================================================================
        // html: {
        //   title: "Test Report",
        //   darkMode: false,
        //   searchable: true,
        //   startCollapsed: false,
        //   embedScreenshots: true,
        // },

        // =================================================================
        // JUNIT OPTIONS (when formats includes "junit")
        // =================================================================
        // junit: {
        //   suiteName: "Test Suite",
        //   includeOutput: true,
        // },

        // =================================================================
        // CUCUMBER JSON OPTIONS (when formats includes "cucumber-json")
        // =================================================================
        // cucumberJson: {
        //   pretty: true,  // Pretty-print JSON
        // },
      },
    ],
  ],
};
