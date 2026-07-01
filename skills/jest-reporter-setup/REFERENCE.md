Disclosed reference for [`jest-reporter-setup`](SKILL.md) — the full option surface and worker file mechanics.

## Full options

```javascript
export default {
  setupFilesAfterEnv: ["executable-stories-jest/setup"],
  reporters: [
    "default",
    [
      "executable-stories-jest/reporter",
      {
        formats: ["markdown", "html", "junit", "cucumber-json"],
        outputDir: "reports",
        outputName: "test-results",
        output: {
          mode: "aggregated",
          // mode: "colocated",
          // colocatedStyle: "mirrored",
        },
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
        rawRunPath: "reports/raw-run.json",
      },
    ],
  ],
};
```

## File-based communication

Jest uses worker processes. Stories are written to `.jest-executable-stories/worker-{id}/*.json` during execution. The reporter aggregates these files in `onRunComplete`. The `JEST_STORY_DOCS_DIR` env var overrides the temp directory.
