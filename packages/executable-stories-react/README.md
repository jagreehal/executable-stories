# executable-stories-react

React components for rendering [executable-stories](https://github.com/jagreehal/executable-stories) StoryReport JSON. Drop into any React host app — Next.js, Astro, Vite, Remix, SvelteKit-as-host — and turn your test runs into living documentation that's also readable by humans, screen readers, and AI agents.

```tsx
import { Report, parseStoryReport } from "executable-stories-react";
import "executable-stories-react/styles.css";

import reportJson from "./story-report.json";

const result = parseStoryReport(reportJson);

export default function Page() {
  return <Report report={result} />;
}
```

## What this is for

`executable-stories` lets your real tests double as living documentation: every `given/when/then` step, every `kv/code/table/mermaid/section` doc entry, every screenshot, every tag becomes a permanent record of how the system behaves. The formatters CLI emits that record as `story-report.json`.

**This package renders that JSON inside your existing React app**, with no fetching, no setup, and full SSR support.

- Drop into your docs portal — engineers, designers, and product see one canonical, always-current spec.
- Drop into your internal dashboard — failures get triaged from the same place you ship from.
- Static-render it for AI agents — the output is plain semantic HTML they can parse without executing JavaScript.

## Two flavors

### `<Report>` — static, pure SSR

Server-renders to fully semantic HTML. No client JS required for content; works in Next.js Server Components, Astro static pages, and `react-dom/server.renderToString`. Best for: docs sites, AI-readable static exports, print, low-JS environments.

```tsx
import { Report, parseStoryReport } from "executable-stories-react";
import "executable-stories-react/styles.css";

export default async function Page() {
  const raw = await readFile("story-report.json", "utf8");
  const result = parseStoryReport(JSON.parse(raw));
  return <Report report={result} />;
}
```

### `<ReportInteractive>` — loaded with chrome

Adds live search (`/` to focus), failure jump (`f`), deep-link auto-scroll, sticky failure banner, keyboard shortcut help (`?`). Same data, same primitives, plus the affordances engineers want when triaging.

```tsx
"use client";
import { parseStoryReport } from "executable-stories-react";
import { ReportInteractive } from "executable-stories-react/interactive";
import "executable-stories-react/styles.css";

export function Triage({ json }: { json: unknown }) {
  return <ReportInteractive report={parseStoryReport(json)} />;
}
```

> `<ReportInteractive>` lives at `executable-stories-react/interactive` so Next.js App Router can statically detect the `"use client"` boundary. The static `<Report>` import stays server-safe.

## Getting started

```bash
pnpm add executable-stories-react executable-stories-formatters
```

Then:

1. Run your tests with one of the framework adapters (vitest, jest, playwright, cypress, etc.).
2. Run `executable-stories format --format story-report-json` to emit `story-report.json`.
3. Import the JSON in your React app and pass it to `<Report>` or `<ReportInteractive>`.

The package has **two peer dependencies**: `react >=18` and `react-dom >=18`. Tested with React 19.

## Customizing

### Custom doc-entry types

`story.custom({ type: "chart", data: ... })` is the canonical escape hatch for user-defined doc content. Provide a renderer:

```tsx
<Report
  report={result}
  customRenderers={{
    chart: (entry) => <MyChart spec={entry.data} />,
    "trace-waterfall": (entry) => <Waterfall spans={entry.data} />,
  }}
/>
```

Unknown types fall back to a `<pre>` JSON dump.

### Overriding the heavy built-ins

`mermaid`, `code`, and `section` are the doc kinds where you might reasonably want to ship your own rendering (you already use shiki in your site, you have a custom mermaid integration, etc.):

```tsx
<Report
  report={result}
  renderers={{
    mermaid: (entry) => <YourMermaid code={entry.code} />,
    code: (entry) => <Shiki code={entry.content} lang={entry.lang} />,
  }}
/>
```

Other kinds (`note`, `tag`, `kv`, `table`, `link`, `screenshot`) are not overridable via this prop — drop down to the primitives if you need a full structural override.

### Composing your own layout

Every primitive is exported. Build whatever you want:

```tsx
import {
  ReportRoot, ReportSummary, ReportFeatureList,
  useReport,
} from "executable-stories-react";

function MyCustomReport({ report }) {
  return (
    <ReportRoot report={report}>
      <aside>
        <ReportSummary />
        <FailureSidebar />
      </aside>
      <main>
        <ReportFeatureList />
      </main>
    </ReportRoot>
  );
}

function FailureSidebar() {
  const report = useReport();
  const failed = report.features.flatMap(f =>
    f.scenarios.filter(s => s.status === "failed")
  );
  return (
    <ul>
      {failed.map(s => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}
    </ul>
  );
}
```

### Theming

Theme via CSS custom properties on `:root` or any parent of the report:

```css
:root {
  --es-color-passed: oklch(72% 0.16 145);
  --es-color-failed: oklch(64% 0.20 25);
  --es-radius: 0.25rem;
  --es-font-body: "Inter", system-ui;
}
```

Auto dark/light via `prefers-color-scheme`. Force a scheme with `data-theme="dark"` or `data-theme="light"` on any ancestor.

The same `--es-*` tokens are emitted by the standalone HTML formatter — overrides on your site theme both reports consistently.

## SSR / framework integration

### Next.js App Router

```tsx
// app/report/page.tsx
import { Report, parseStoryReport } from "executable-stories-react";
import "executable-stories-react/styles.css";
import { readFile } from "node:fs/promises";

export default async function ReportPage() {
  const raw = await readFile("./story-report.json", "utf8");
  return <Report report={parseStoryReport(JSON.parse(raw))} />;
}
```

For interactivity, wrap a client component:

```tsx
// app/report/page.tsx (server)
import { ClientReport } from "./client";

export default async function Page() {
  const raw = await readFile("./story-report.json", "utf8");
  return <ClientReport json={JSON.parse(raw)} />;
}

// app/report/client.tsx
"use client";
import { parseStoryReport } from "executable-stories-react";
import { ReportInteractive } from "executable-stories-react/interactive";
import "executable-stories-react/styles.css";

export function ClientReport({ json }: { json: unknown }) {
  return <ReportInteractive report={parseStoryReport(json)} />;
}
```

### Astro Starlight

Use `<Report>` directly in `.astro` files (it's framework-agnostic semantic HTML on the server). Use `<ReportInteractive>` with `client:visible` if you want the live search.

```astro
---
import { Report, parseStoryReport } from "executable-stories-react";
import data from "../public/story-report.json";

const result = parseStoryReport(data);
---
<Report report={result} />
```

### Vite / static export

Both `<Report>` and `<ReportInteractive>` work with vanilla Vite + React 19. The static page produced by `renderToString` is fully self-contained.

## What you get for free

- **Stable IDs** for deep linking: `#feature-todos--add-a-todo` always scrolls to that scenario.
- **Schema validation** at the boundary: `parseStoryReport(unknown): Result<StoryReport>`. Wrong major version, missing fields, unknown doc kinds — all caught with a `<ReportSchemaError>` instead of a runtime crash.
- **AI-readable static output**: scenario titles in `<h3>`, errors in `<pre role="alert">`, mermaid source in `<pre data-mermaid>`, code in `<pre><code class="language-X">`. A language model can answer "what's failing?" from the raw HTML.
- **Print stylesheet**: docs are documents.
- **No bundler config**: tsup ESM+CJS, react/react-dom externalized.

## Compatibility

| Schema | Package |
|--------|---------|
| `StoryReport` v1.x | `executable-stories-react` 0.x |

`parseStoryReport` accepts any 1.x report. A 2.x report renders `<ReportSchemaError>` with an upgrade hint — see `SCHEMA_VERSION_MISMATCH` in the result error code.

## License

MIT — see [LICENSE](../../LICENSE).
