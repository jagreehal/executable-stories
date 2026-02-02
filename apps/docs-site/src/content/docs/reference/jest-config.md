---
title: Jest reporter options
description: Every option for StoryReporter in Jest
---

In `jest.config.js`:

```javascript
module.exports = {
  reporters: [
    "default",
    ["jest-executable-stories/reporter", { /* options */ }],
  ],
};
```

## Options reference

Same as [Vitest reporter options](/reference/vitest-config/): `title`, `description`, `includeFrontMatter`, `output`, `permalinkBaseUrl`, `enableGithubActionsSummary`, `includeSummaryTable`, `includeMetadata`, `metadata`, `includeJson`, `json`, `coverage`, `groupBy`, `scenarioHeadingLevel`, `stepStyle`, `markdown`, `includeStatus`, `includeDurations`, `includeErrorInMarkdown`, `includeEmpty`, `sortFiles`, `sortScenarios`, `filter`, `includeSourceLinks`, `ticketUrlTemplate`, `customRenderers`.

**Default output:** when `output` is a string, e.g. `"docs/user-stories.md"`. When omitted, behavior is package-specific (see Jest package README).

**Example:**

```javascript
["jest-executable-stories/reporter", {
  title: "User Stories",
  output: "docs/user-stories.md",
  includeSummaryTable: true,
  permalinkBaseUrl: "https://github.com/your-org/your-repo/blob/main/",
}]
```
