---
title: CI and source links
description: Permalink to source and GitHub Actions job summary
---

The reporter can add **source links** to each scenario (e.g. “Source: [file](url)”) and, in GitHub Actions, append the report to the **job summary**.

## Permalink to source

If you set **`permalinkBaseUrl`** in the reporter config, each scenario in the report gets a source link:

```markdown
## ✅ User logs in
Source: [login.story.test.ts](https://github.com/org/repo/blob/abc123/src/auth/login.story.test.ts)
- **Given** user is on login page
...
```

### Setting the base URL

In CI, set `permalinkBaseUrl` from environment variables, for example:

```ts
// Example: Jest
reporters: ["default", ["jest-executable-stories/reporter", {
  output: "docs/user-stories.md",
  permalinkBaseUrl: process.env.GITHUB_SERVER_URL + '/' + process.env.GITHUB_REPOSITORY + '/blob/' + process.env.GITHUB_SHA + '/',
}]],
```

Same idea for Vitest and Playwright: pass the base URL (including trailing slash) so the reporter can build `permalinkBaseUrl + relativePath` for each file.

### GitHub Actions fallback

If **`permalinkBaseUrl`** is **not** set and **`GITHUB_ACTIONS`** is set, the reporter builds the base URL from:

- `GITHUB_SERVER_URL`
- `GITHUB_REPOSITORY`
- `GITHUB_SHA`
- and the project root

So source links can work in GitHub Actions **without** any config. To disable source links, set `includeSourceLinks: false` in the reporter options.

## GitHub Actions job summary

When **`enableGithubActionsSummary`** is `true` (default) and **`process.env.GITHUB_ACTIONS === 'true'`**, the reporter **appends** the generated Markdown to the GitHub Actions **job summary**. The report then appears on the workflow run page.

- If **`@actions/core`** is available (installed in the repo), the reporter uses it to append to the job summary.
- If `@actions/core` is not available, the reporter skips the summary and still writes the Markdown file(s).

To **disable** the job summary: set `enableGithubActionsSummary: false` in the reporter config.

**Jest:**

```ts
["jest-executable-stories/reporter", { output: "docs/user-stories.md", enableGithubActionsSummary: false }]
```

**Vitest:** `new StoryReporter({ enableGithubActionsSummary: false })`.

**Playwright:** `["playwright-executable-stories/reporter", { output: "docs/user-stories.md", enableGithubActionsSummary: false }]`.
