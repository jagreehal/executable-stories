---
title: Understanding the report
description: Status icons, headings, and what the generated Markdown means
---

The reporter turns story metadata and test results into Markdown. Each scenario gets a **status icon** and optional headings and source links.

## Scenario status icons

Scenarios show a status icon based on step results, with this **precedence**:

1. **❌** — Any step failed  
2. **✅** — All steps passed  
3. **📝** — All steps are todo (or fixme on Playwright)  
4. **⏩** — All steps are skipped  
5. **⚠️** — Mixed (e.g. some passed, some skipped)

So a scenario is marked failed if any step failed, even if others passed or were skipped.

## Heading levels

- When scenarios are **grouped by file** (default), each scenario title uses heading level 3 (`###`). The file group uses level 2 (`##`).
- When **grouped by none** (`groupBy: "none"`), scenario titles use level 2 (`##`).

You can override with `scenarioHeadingLevel` / `storyHeadingLevel` in reporter options (see each framework’s reference).

## What appears in the report

- **Story title** — The first argument to `story("...", ...)` (or `doc.story("...", task)` for framework-native tests). The **it/test name is not used** for the scenario heading.
- **Steps** — Each `given` / `when` / `then` (and `and`, `but`) as a bullet. Modifiers like skip/todo/fails are reflected in the step label (e.g. _(skipped)_, _(todo)_).
- **Tags and options** — If you pass `{ tags: [...], meta: {...} }` to `story(...)`, they can be included (see reporter options).
- **Step documentation** — Notes, key-value pairs, code blocks, tables, and links added via the `doc` API appear under the corresponding step.
- **Source link** — If `permalinkBaseUrl` is set (or in GitHub Actions with the built-in fallback), each scenario can get a “Source: [file](url)” line.

## Enabling or hiding elements

Reporter options control what’s included:

- **Status icons:** `includeStatus: true` (default).
- **Error in Markdown:** `includeErrorInMarkdown: true` to include failure messages for failed scenarios.
- **Summary table:** `includeSummaryTable: true` to add a table with start time, duration, and counts.
- **Metadata block:** `includeMetadata`, `metadata.date`, `metadata.packageVersion`, `metadata.gitSha`.
- **Source links:** `includeSourceLinks: true` and `permalinkBaseUrl` (or rely on GitHub Actions fallback).

See [Vitest reporter options](../reference/vitest-config/), [Jest reporter options](../reference/jest-config/), and [Playwright reporter options](../reference/playwright-config/) for the full list.
