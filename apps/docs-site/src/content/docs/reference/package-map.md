---
title: Package map
description: What each executable-stories package does and when to use it
---

Use this page to pick the right package. Tests stay in your framework; packages add story metadata, reports, and agent-facing artifacts.

## Core pipeline

| Package | Role | Install when |
| --- | --- | --- |
| [executable-stories-formatters](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-formatters) | RawRun → ACL → HTML, Markdown, JUnit, Cucumber, StoryReport JSON; CLI (`executable-stories`) | You need reports or the CLI in CI |
| [executable-stories-mcp](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-mcp) | Read-only MCP tools over StoryReport JSON | A coding agent needs discover/query tools |
| [executable-stories-react](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-react) | Render StoryReport JSON in React apps | You embed reports in a product UI |
| [executable-stories-demo](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-demo) | Astro/Starlight demo site from run artifacts | You publish a behavior catalog site |
| [executable-stories-init](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-init) | Bootstrap JS adapters and reporter wiring | You want guided first-time setup |

## JavaScript / TypeScript adapters

| Package | Framework | Notes |
| --- | --- | --- |
| [executable-stories-vitest](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-vitest) | Vitest | `story.init(task)` — no top-level `then` export |
| [executable-stories-jest](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-jest) | Jest | `story.init()` + optional top-level step helpers |
| [executable-stories-playwright](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-playwright) | Playwright | Fixture-aware steps; reporter for E2E stories |
| [executable-stories-cypress](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-cypress) | Cypress | Support file + plugin + reporter split |

Each adapter emits RawRun JSON (via reporter `rawRunPath` or language default). Feed that file to `executable-stories format`.

## Language adapters (non-JS)

| Package | Language | Output |
| --- | --- | --- |
| [executable-stories-go](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-go) | Go | `.executable-stories/raw-run.json` |
| [executable-stories-pytest](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-pytest) | Python | `.executable-stories/raw-run.json` |
| [executable-stories-ruby](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-ruby) | Ruby (Minitest/RSpec) | `.executable-stories/raw-run.json` |
| [executable-stories-rust](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-rust) | Rust | `.executable-stories/raw-run.json` |
| [executable-stories-junit5](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-junit5) | Kotlin / JUnit 5 | `.executable-stories/raw-run.json` |
| [executable-stories-xunit](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-xunit) | C# / xUnit | `.executable-stories/raw-run.json` |

Non-JS adapters do not bundle the Node formatter. Install `executable-stories-formatters` (or use the prebuilt binary) to generate HTML, StoryReport JSON, and other outputs.

## Linting

| Package | Framework |
| --- | --- |
| [eslint-plugin-executable-stories-vitest](https://github.com/jagreehal/executable-stories/tree/main/packages/eslint-plugin-executable-stories-vitest) | Vitest story usage guards |
| [eslint-plugin-executable-stories-jest](https://github.com/jagreehal/executable-stories/tree/main/packages/eslint-plugin-executable-stories-jest) | Jest story usage guards |
| [eslint-plugin-executable-stories-playwright](https://github.com/jagreehal/executable-stories/tree/main/packages/eslint-plugin-executable-stories-playwright) | Playwright story usage guards |
| [eslint-config-executable-stories](https://github.com/jagreehal/executable-stories/tree/main/packages/eslint-config) | Shared ESLint flat config for this repo |

## Decision tree

```text
Integrate story tests in an existing repo?
  → Pick the adapter for your framework (Vitest/Jest/Playwright/Cypress or Go/pytest/Ruby/…)
  → Add executable-stories-formatters for reports + CLI

Publish human-readable docs from CI?
  → Adapter reporter or raw-run + `executable-stories format --format html,markdown`

Give coding agents behavior context?
  → Emit StoryReport JSON + scenario index (see Agent artifact contract)
  → Optional: executable-stories-mcp

Embed reports in a React product?
  → executable-stories-react

Bootstrap a new JS project quickly?
  → executable-stories-init
```

See also: [Agent artifact contract](/guides/agent-artifact-contract/), [Cross-language parity](/reference/cross-language-parity/), [MCP server](/guides/mcp-server/), [Setup decision tree](/guides/setup-decision-tree/).
