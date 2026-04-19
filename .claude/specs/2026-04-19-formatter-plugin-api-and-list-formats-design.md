# Design: Custom Formatter Plugin API + List Command Output Formats

Date: 2026-04-19
Package: `packages/executable-stories-formatters`

## Scope

Two independent features:

1. **Custom formatter plugin API** — let users register their own output formats via a config file
2. **List command output formats** — add CSV and Markdown table output modes to the `list` subcommand

---

## Feature 1: Custom Formatter Plugin API

### Goal

Allow users to ship or write their own output formatter (e.g. Notion export, custom HTML, Confluence wiki markup) and invoke it via `--format my-format` in the CLI.

### Formatter Interface

New file: `src/types/formatter.ts`

```ts
export interface Formatter {
  name: string;
  fileExtension?: string; // defaults to name if omitted
  format(run: TestRunResult): string;
}
```

All existing built-in formatters already satisfy this shape. The interface is additive — no changes to existing formatters required.

### Config File

The CLI looks for `executable-stories.config.js` in `cwd` at startup. Override with `--config ./path/to/config.js`.

```js
// executable-stories.config.js
import { MyFormatter } from 'my-formatter-pkg';

export default {
  formatters: {
    'my-format': new MyFormatter({ option: true }),
  },
};
```

- Config is loaded once via `await import(resolvedPath)` before any formatting begins.
- If no config file exists, startup proceeds silently (config is optional).
- Config load errors (missing default export, bad shape) produce a clear error message and exit 1.

### CLI Integration

- `--format my-format` resolves first against built-in format names, then against keys registered in config.
- Unknown format names that don't match any built-in or registered formatter: error with list of known names.
- `--config <path>` flag added to the `format` subcommand.
- Multiple `--format` flags still work: built-ins and custom formatters can be mixed in one run.

### Output

- Custom formatters write to `--output-dir` like built-ins.
- Output filename: `report.{fileExtension ?? name}` unless `--output-name` is provided.

### Config Type Export

`executable-stories.config.js` shape is typed and exported from the package for users who want type-safe config:

```ts
export interface ExecutableStoriesConfig {
  formatters?: Record<string, Formatter>;
}
```

### Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Config file not found | Silent — no custom formatters registered |
| Config file has no default export | Error + exit 1 |
| Formatter `format()` throws | Error logged with formatter name, run continues with remaining formatters |

---

## Feature 4: List Command Output Formats

### Goal

Add `--format csv` and `--format markdown-table` to the `list` subcommand so scenario inventories can be pasted into PRs, Confluence pages, or imported into spreadsheets.

### New `--format` Flag (list subcommand)

Replaces the current `--json-summary` flag (kept as a deprecated alias for backward compat).

| Value | Output |
|-------|--------|
| `text` | Existing human-readable table (default) |
| `json` | Existing JSON array (replaces `--json-summary`) |
| `csv` | RFC 4180 CSV with headers |
| `markdown-table` | GitHub-flavoured pipe table |

### CSV Format

```csv
id,scenario,status,sourceFile,sourceLine,tags
abc123,User logs in,passed,src/auth.story.test.ts,12,@smoke @auth
```

- Tags joined with space.
- Values with commas or quotes are properly escaped per RFC 4180.
- Written to stdout (same as existing `list` text output) unless `--output-dir` is specified.

### Markdown Table Format

```md
| Status | Scenario | Location | Tags |
|--------|----------|----------|------|
| ✅ | User logs in | src/auth.story.test.ts:12 | @smoke |
| ❌ | User logs out | src/auth.story.test.ts:34 | |
```

- Status column uses emoji icons (same as text format).
- Location is `file:line`.
- Empty tags cell left blank (not "—").

### Implementation

- New file: `src/list-scenarios-format.ts` — exports `formatScenarioList(scenarios, format)` function.
- `cli.ts` calls this helper; no logic duplication.
- `listScenarios()` in `src/list-scenarios.ts` is unchanged.
- All four format paths covered by unit tests in the existing test suite.

---

## What's Not In Scope

- Async formatter `format()` methods — synchronous only.
- Config file supporting `.ts` extension — JS only (no tsx/jiti dependency).
- Config file for non-formatter settings (no scope creep into a general config system).
- Cross-run analytics dashboard — separate feature, separate spec.
