---
title: Playwright reporter options
description: Every option for StoryReporter in Playwright
---

In `playwright.config.ts`:

```typescript
import { defineConfig } from "@playwright/test";
import { StoryReporter } from "playwright-executable-stories/reporter";

export default defineConfig({
  reporter: [
    ["list"],
    [new StoryReporter(), { output: "docs/user-stories.md" }],
  ],
  // ...
});
```

## Options reference

Same as [Vitest reporter options](/reference/vitest-config/): `title`, `description`, `includeFrontMatter`, `output`, `permalinkBaseUrl`, `enableGithubActionsSummary`, `includeSummaryTable`, `includeMetadata`, `metadata`, `includeJson`, `json`, `coverage`, `groupBy`, `scenarioHeadingLevel`, `stepStyle`, `markdown`, `includeStatus`, `includeDurations`, `includeErrorInMarkdown`, `includeEmpty`, `sortFiles`, `sortScenarios`, `filter`, `includeSourceLinks`, `ticketUrlTemplate`, `customRenderers`.

**Example:**

```typescript
[new StoryReporter(), {
  title: "User Stories",
  output: "docs/user-stories.md",
  includeSummaryTable: true,
  permalinkBaseUrl: "https://github.com/your-org/your-repo/blob/main/",
}]
```
