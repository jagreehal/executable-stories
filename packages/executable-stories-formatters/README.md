# executable-stories-formatters

Cucumber-compatible report formats (HTML, Markdown, JUnit XML, Cucumber JSON) for executable-stories test results.

## Install

```bash
npm install executable-stories-formatters
```

## Quick Start — Programmatic API

```ts
import {
  canonicalizeRun,
  ReportGenerator,
} from "executable-stories-formatters";
import type { RawRun } from "executable-stories-formatters";

// 1. Build a RawRun from your test framework (or use a built-in adapter)
const raw: RawRun = {
  projectRoot: process.cwd(),
  testCases: [
    {
      status: "pass",
      story: {
        scenario: "User logs in",
        steps: [
          { keyword: "Given", text: "the user is on the login page" },
          { keyword: "When", text: "they enter valid credentials" },
          { keyword: "Then", text: "they see the dashboard" },
        ],
      },
    },
  ],
};

// 2. Canonicalize the raw run
const run = canonicalizeRun(raw);

// 3. Generate reports
const generator = new ReportGenerator({
  formats: ["html", "markdown"],
  outputDir: "reports",
});
const results = await generator.generate(run);
// results: Map<"html" | "markdown", string[]>  (file paths written)
```

## Quick Start — CLI

```bash
# Generate an HTML report from a JSON run file
executable-stories format run.json --format html

# Generate multiple formats
executable-stories format run.json --format html --format markdown

# Validate a run file against the schema
executable-stories validate run.json

# Include only test cases from matching source files (glob patterns)
executable-stories format raw-run.json --include "**/*.Story*.cs" --format html

# Exclude test cases by source file glob
executable-stories format raw-run.json --exclude "**/obj/**" --format markdown
```

### Filtering by source file

You can limit which test cases appear in reports using **include** and **exclude** glob patterns on `sourceFile`:

- **`--include <globs>`** — Comma-separated globs; only test cases whose `sourceFile` matches at least one pattern are included. If omitted, all test cases are considered.
- **`--exclude <globs>`** — Comma-separated globs; test cases whose `sourceFile` matches any pattern are excluded. Applied after include.

Patterns use the same glob semantics as output rules (`*` and `**`). Paths are normalized to forward slashes. This works with any framework that sets `sourceFile` on raw test cases (Jest, Vitest, Playwright, xUnit, etc.).

Programmatic API:

```ts
const generator = new ReportGenerator({
  include: ["**/auth/**", "**/*.Story*.cs"],
  exclude: ["**/Generated/**"],
  formats: ["html", "markdown"],
  outputDir: "reports",
});
```

## Architecture

```
┌──────────────────────────┐
│  Framework Test Results  │
│  (Jest / Vitest / PW)    │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│  Layer 1: Adapters       │   RawRun
│  adaptJestRun()          │
│  adaptVitestRun()        │
│  adaptPlaywrightRun()    │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│  Layer 2: ACL            │   TestRunResult
│  canonicalizeRun()       │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│  Layer 3: Formatters     │   HTML / Markdown / JUnit / Cucumber JSON
│  ReportGenerator         │
└──────────────────────────┘
```

## Output Formats

| Format | Description | File Extension |
| --- | --- | --- |
| `html` | Interactive HTML report with search and screenshots | `.html` |
| `markdown` | Markdown user-story documentation | `.md` |
| `junit` | JUnit XML for CI integration | `.junit.xml` |
| `cucumber-json` | Cucumber JSON for tooling compatibility | `.cucumber.json` |

## Writing a Custom Adapter

To integrate a new test framework, build a `RawRun` object from your framework's results, then pass it through `canonicalizeRun()`.

### `RawRun` Interface

```ts
interface RawRun {
  testCases: RawTestCase[];
  startedAtMs?: number;    // Run start time (epoch ms)
  finishedAtMs?: number;   // Run finish time (epoch ms)
  projectRoot: string;     // Project root directory
  packageVersion?: string; // Package version
  gitSha?: string;         // Git commit SHA
  ci?: RawCIInfo;          // CI environment info
}
```

### `RawTestCase` Interface

```ts
interface RawTestCase {
  status: RawStatus;           // "pass" | "fail" | "skip" | "todo" | "pending" | "timeout" | "interrupted" | "unknown"
  story?: StoryMeta;           // Story metadata from test (from executable-stories-core)
  externalId?: string;         // Framework's test ID
  title?: string;              // Test title/name
  titlePath?: string[];        // Full title path (describe blocks + test name)
  sourceFile?: string;         // Source file path
  sourceLine?: number;         // Source line number (1-based)
  durationMs?: number;         // Duration in milliseconds
  error?: {                    // Error information
    message?: string;
    stack?: string;
  };
  stepEvents?: RawStepEvent[]; // Step-level info if framework provides it
  attachments?: RawAttachment[]; // Screenshots, logs, etc.
  retry?: number;              // Retry attempt number (0-based)
  retries?: number;            // Total retry count configured
  projectName?: string;        // Playwright project name
  meta?: Record<string, unknown>; // Framework-specific metadata
}
```

## API Reference

### Core

- `canonicalizeRun(raw, options?)` — Normalize a `RawRun` into a canonical `TestRunResult`
- `validateCanonicalRun(run)` — Validate a canonical run, returning errors
- `assertValidRun(run)` — Validate and throw on invalid data
- `ReportGenerator` — High-level report generator combining all formatters
- `createReportGenerator(options?, deps?)` — Factory for `ReportGenerator`

### Formatters

- `CucumberJsonFormatter` — Cucumber JSON output
- `HtmlFormatter` — Interactive HTML report
- `JUnitFormatter` — JUnit XML output
- `MarkdownFormatter` — Markdown documentation

### Built-in Adapters

- `adaptJestRun(results, storyReports, options?)` — Convert Jest results to `RawRun`
- `adaptVitestRun(testModules, options?)` — Convert Vitest results to `RawRun`
- `adaptPlaywrightRun(testResults, options?)` — Convert Playwright results to `RawRun`

### Convenience Functions

- `normalizeJestResults(...)` — `adaptJestRun` + `canonicalizeRun` in one call
- `normalizeVitestResults(...)` — `adaptVitestRun` + `canonicalizeRun` in one call
- `normalizePlaywrightResults(...)` — `adaptPlaywrightRun` + `canonicalizeRun` in one call

### Types

See the TypeScript type exports for `TestRunResult`, `RawRun`, `RawTestCase`, `FormatterOptions`, and more. `FormatterOptions` supports `include` and `exclude` (string arrays of glob patterns) to filter test cases by `sourceFile` before generating reports.

## License

MIT
