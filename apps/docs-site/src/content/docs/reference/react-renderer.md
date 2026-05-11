---
title: React renderer
description: Render StoryReport JSON inside any React host app with executable-stories-react
---

The **`executable-stories-react`** package renders [StoryReport](#the-storyreport-contract) JSON inside any React app — Next.js (App Router or Pages), Astro islands, Remix, Vite, plain SPA. Drop in `<Report report={data} />` for a static, semantic, AI-readable render. Drop in `<ReportInteractive>` for live search, failure jump, deep-link sync, and keyboard navigation.

It's the same data your existing CLI already emits: test results become living documentation that lives inside your team's actual product, docs portal, or dashboard.

## Installation

```bash
pnpm add executable-stories-react executable-stories-formatters
```

The package has two peer dependencies (`react >=18`, `react-dom >=18`) and ships ESM + CJS.

Import the stylesheet once at the root of your app:

```ts
import "executable-stories-react/styles.css";
```

## The StoryReport contract

`executable-stories-react` consumes **StoryReport v1 JSON**, emitted by the formatters CLI:

```bash
executable-stories format raw-run.json --format story-report-json
# writes reports/test-results.story-report.json
```

The schema is **pre-grouped** (features → scenarios → steps) with **pre-computed summaries** at every level. It's the canonical UI-facing shape — distinct from the internal `TestRunResult` formatters use. Schema version follows semver (`"1.0"` today; additive-only within `1.x`).

Source: [`schemas/story-report-v1.json`](https://github.com/jagreehal/executable-stories/tree/main/packages/executable-stories-formatters/schemas/story-report-v1.json) in the formatters package.

## Three entry points

The package ships three subpath imports so Next.js App Router can statically detect client boundaries:

| Subpath | What | Use when |
| --- | --- | --- |
| `executable-stories-react/parse` | `parseStoryReport`, `Result` types, Zod schema. Server-safe. | Validating JSON in a Server Component or build script. |
| `executable-stories-react` | `<Report>` + primitives. `"use client"`. | Rendering the report. SSRs on the server, hydrates on the client. |
| `executable-stories-react/interactive` | `<ReportInteractive>` + chrome. `"use client"`. | Adding live search, failure banner, keyboard shortcuts. |

```tsx
// app/report/page.tsx (Next.js Server Component)
import { readFile } from "node:fs/promises";
import { parseStoryReport } from "executable-stories-react/parse";
import { Report } from "executable-stories-react";

export default async function ReportPage() {
  const raw = await readFile("./story-report.json", "utf8");
  return <Report report={parseStoryReport(JSON.parse(raw))} />;
}
```

For the interactive flavor inside the same App Router setup:

```tsx
// app/report/client.tsx
"use client";
import { parseStoryReport } from "executable-stories-react/parse";
import { ReportInteractive } from "executable-stories-react/interactive";

export function ClientReport({ json }: { json: unknown }) {
  return <ReportInteractive report={parseStoryReport(json)} />;
}
```

## Components

### `<Report>` — static high-level

```tsx
<Report
  report={parseStoryReport(json)}
  title="Story Report"
  customRenderers={{ chart: MyChart }}
  renderers={{ mermaid: MyMermaid }}
/>
```

**Props:**

| Prop | Type | Description |
| ---- | ---- | ----------- |
| `report` | `StoryReport \| Result<StoryReport>` | Either a validated StoryReport or the `Result` returned by `parseStoryReport`. On `Result.ok=false`, renders `<ReportSchemaError>` automatically. |
| `customRenderers` | `Record<string, (entry) => ReactNode>` | Renderers keyed by `story.custom({ type })` strings. Unmatched types fall back to a JSON dump. |
| `renderers` | `{ mermaid?, code?, section? }` | Override the three heavy built-ins. Other doc kinds (`note`, `kv`, `table`, etc.) are fixed — drop to primitives for full structural overrides. |
| `title` | `string` | Optional override for the report's `<h1>`. Default: "Story Report". |
| `dataTheme` | `"light" \| "dark"` | Force a theme scope. Default: auto via `prefers-color-scheme`. |
| `className` | `string` | Extra class on the `<main>` landmark. |

### `<ReportInteractive>` — loaded with chrome

Adds search, sticky failure banner with jump-to-first, keyboard navigation (`/`, `f`, `Shift+F`, `?`, `Esc`), deep-link auto-scroll, and a keyboard cheatsheet dialog. Takes the same props as `<Report>`.

### Primitives

Every primitive is exported so you can compose your own layout:

```tsx
import {
  ReportRoot,
  ReportSummary,
  ReportFeatureList,
  ReportFeature,
  ReportScenarioList,
  ReportScenario,
  ReportSteps,
  ReportDocEntries,
  ReportEmpty,
  ReportSchemaError,
  useReport,
} from "executable-stories-react";
```

Each per-kind doc entry is also a named export: `DocNote`, `DocTag`, `DocKv`, `DocCode`, `DocTable`, `DocLink`, `DocSection`, `DocMermaid`, `DocScreenshot`, `DocCustom`, plus the `DocEntry` dispatcher.

## Theming

Theme via CSS custom properties on `:root` or any ancestor of the report. The full token catalog uses the `--es-*` namespace:

```css
:root {
  --es-color-passed: oklch(72% 0.16 145);
  --es-color-failed: oklch(64% 0.20 25);
  --es-color-bg: #fff;
  --es-radius: 0.25rem;
  --es-font-body: "Inter", system-ui;
}
```

The same tokens are emitted by the standalone HTML formatter (see [HTML themes](/reference/themes)). One CSS override re-themes both.

Dark/light adapts automatically to `prefers-color-scheme`. Force a scheme with `data-theme="dark"` (or `"light"`) on any parent element.

## Schema validation

`parseStoryReport(unknown): Result<StoryReport>` runs the JSON through a Zod schema generated from `schemas/story-report-v1.json` via `z.fromJSONSchema()`. Returns:

- `{ ok: true, data }` for valid input
- `{ ok: false, error: { message, code, issues? } }` for invalid input

Error codes:

| Code | When |
| ---- | ---- |
| `INVALID_INPUT` | Input isn't an object. |
| `SCHEMA_VERSION_MISMATCH` | Major version differs from the package's expected major (currently `1`). |
| `VALIDATION_FAILED` | Shape passed the version check but failed Zod validation. `issues` lists each problem. |

`<Report>` and `<ReportInteractive>` accept a `Result<StoryReport>` directly. On error they render `<ReportSchemaError>` with an upgrade hint when relevant.

## SSR

Every primitive renders to fully semantic HTML on the server via `react-dom/server.renderToString`. The output is:

- `<main aria-label="...">` landmark
- `<section aria-labelledby="feature-X-title">` per feature
- `<article aria-labelledby="scenario-X-title">` per scenario, with stable `id` anchors for deep links
- `<ol>` for steps with keyword + text in plain text nodes
- `<dl>` for KV docs, `<table>` for table docs, `<figure>` for screenshots/code/mermaid
- `<pre data-mermaid>` and `<pre><code class="language-X">` for AI-readable source

JavaScript is required only for the chrome in `<ReportInteractive>`. The content reads end-to-end without JS — works for AI agents, screen readers, RSS, print, and view-source.

## See also

- [Formatters API → `story-report-json` format](/reference/formatters-api) — emit the JSON the React package consumes.
- [Embed reports in React apps](/guides/embed-in-react-apps) — worked examples for Next.js, Astro, and Vite.
- [HTML themes](/reference/themes) — the same `--es-*` tokens that style this component.
