Disclosed reference for [`vitest-reporter-setup`](SKILL.md) — output-mode variants and the full option surface.

## Output modes

These modes route rendered pages. Independently, every run maintains canonical
per-source state under `<outputDir>/by-file/`.

```typescript
// Aggregated (default) — one file per format
createStoryReporter({
  formats: ["markdown"],
  outputDir: "docs",
  outputName: "user-stories",
  output: { mode: "aggregated" },
})
// → docs/user-stories.md

// Colocated mirrored — one file per source, directory mirrored
createStoryReporter({
  formats: ["markdown"],
  outputDir: "docs",
  output: { mode: "colocated", colocatedStyle: "mirrored" },
})
// test/auth/login.story.test.ts → docs/test/auth/login.story.md

// Colocated adjacent — written next to the test file
createStoryReporter({
  formats: ["markdown"],
  output: { mode: "colocated", colocatedStyle: "adjacent" },
})
// test/auth/login.story.test.ts → test/auth/login.story.md

// Colocated flat — tidy page names directly under outputDir
createStoryReporter({
  formats: ["markdown"],
  outputDir: "docs",
  output: { mode: "colocated", colocatedStyle: "flat" },
})
// test/auth/login.story.test.ts → docs/login.md
```

## Format-specific options

```typescript
createStoryReporter({
  formats: ["markdown", "html", "junit", "cucumber-json"],
  outputDir: "reports",
  markdown: {
    title: "User Stories",
    includeStatusIcons: true,
    includeErrors: true,
    includeMetadata: true,
    sortScenarios: "source",
    ticketUrlTemplate: "https://jira.example.com/browse/{ticket}",
  },
  html: {
    title: "Test Report",
    syntaxHighlighting: true,
    mermaidEnabled: true,
  },
  junit: {
    suiteName: "My Test Suite",
    includeOutput: true,
  },
  cucumberJson: { pretty: true },
})
```

## Pattern-based output rules

```typescript
createStoryReporter({
  formats: ["markdown"],
  output: {
    mode: "aggregated",
    rules: [
      {
        match: "test/api/**",
        mode: "colocated",
        colocatedStyle: "adjacent",
        formats: ["markdown", "html"],
      },
      {
        match: "test/e2e/**",
        outputDir: "docs/e2e",
        outputName: "e2e-stories",
      },
    ],
  },
})
```

## Raw run output for CLI

```typescript
createStoryReporter({
  formats: ["markdown"],
  rawRunPath: "reports/raw-run.json",
  enableGithubActionsSummary: true,
})
```

`rawRunPath` is the current execution event for `check`, `triage`, and `goal`.
Use `reports/by-file/` or a StoryReport generated from it when a consumer needs the
whole accumulated suite.
