# executable-stories-core

Shared foundation for the executable-stories packages: the canonical types, the
ACL converter pipeline, the doc model, and the theme tokens.

Node-only. No CLI, no server, no publishers, no notifiers, and no runtime
dependencies.

## What lives here

- **Types** — `raw`, `test-result`, `story`, `story-report`, `cucumber-messages`, `ci`, `otel`
- **Converters** — `canonicalizeRun`, `synthesizeStories`, `assertValidRun`, the NDJSON and StoryReport converters
- **Utils** — doc-builders, duration, source-file, url, scenario-markdown
- **Theme tokens** and the run-trajectory primitives (`advanceState`, `summarizeRun`, `trajectorySummary`)
- **Schema** — the canonical `schemas/story-report-v1.json`

## Install

You usually do not install this directly. It arrives as a dependency of
`executable-stories-formatters`, `executable-stories-react`,
`executable-stories-astro`, `executable-stories-mcp`, and the framework
adapters.

```bash
npm install executable-stories-core
```

## Usage

```ts
import { canonicalizeRun } from 'executable-stories-core/converters/acl/index';
import type { RawRun } from 'executable-stories-core/types/raw';

const canonical = canonicalizeRun({ run: rawRun });
```

## API stability

The root export (`executable-stories-core`) is the supported surface.

Deep subpaths (`executable-stories-core/types/*`, `/converters/*`, `/utils/*`)
exist so the first-party packages can import exact modules and keep type
identity. They are internal: they can change or disappear in any release
without a major bump. Depend on them at your own risk.

## License

Apache-2.0. See [LICENSE](./LICENSE) and the repository
[trademark policy](https://github.com/jagreehal/executable-stories/blob/main/TRADEMARKS.md).
