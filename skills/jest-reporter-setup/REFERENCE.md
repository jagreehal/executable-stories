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
          // colocatedStyle: "flat", // or "mirrored" / "adjacent"
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

Use a unique absolute `JEST_STORY_DOCS_DIR` for any nested Jest process in an
integration test and clean it afterward; sharing the default scratch directory lets
unrelated nested runs contaminate each other. The final reporter then updates canonical
per-source state under `<outputDir>/by-file/`. `rawRunPath` remains the current execution
event.
