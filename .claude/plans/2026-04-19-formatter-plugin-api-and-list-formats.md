# Formatter Plugin API + List Output Formats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a config-file-based custom formatter plugin API and CSV/markdown-table output modes to the `list` subcommand.

**Architecture:** A new `Formatter` interface defines the plugin contract; `src/config.ts` loads `executable-stories.config.js` at CLI startup via `await import()`; the CLI separates built-in and custom formats before dispatch. List formats are extended directly in `src/list-scenarios.ts` with new serialisation paths.

**Tech Stack:** TypeScript, Node.js `fs`, `node:path`, Vitest for tests.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/types/formatter.ts` | `Formatter` interface + `ExecutableStoriesConfig` type |
| Create | `src/config.ts` | Load `executable-stories.config.js` from disk |
| Create | `test/fixtures/config/valid.config.js` | Test fixture: valid config with a custom formatter |
| Create | `test/fixtures/config/no-default.config.js` | Test fixture: config with no default export |
| Create | `test/config.test.ts` | Unit tests for config loading |
| Modify | `src/list-scenarios.ts` | Extend format type + add CSV/markdown-table serialisers |
| Modify | `test/list-scenarios.test.ts` | Add tests for CSV and markdown-table formats |
| Modify | `src/cli.ts` | `--config` flag, custom format validation, custom formatter execution, `list --format` flag |
| Modify | `src/index.ts` | Export `Formatter` and `ExecutableStoriesConfig` |

---

## Task 1: Define Formatter interface

**Files:**
- Create: `src/types/formatter.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create `src/types/formatter.ts`**

```ts
import type { TestRunResult } from "./test-result.js";

export interface Formatter {
  name: string;
  fileExtension?: string;
  format(run: TestRunResult): string;
}

export interface ExecutableStoriesConfig {
  formatters?: Record<string, Formatter>;
}
```

- [ ] **Step 2: Export new types from `src/index.ts`**

Add after the last `export type` block at the top of `src/index.ts`:

```ts
export type { Formatter, ExecutableStoriesConfig } from "./types/formatter.js";
```

- [ ] **Step 3: Type-check**

```bash
cd packages/executable-stories-formatters
pnpm type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/executable-stories-formatters/src/types/formatter.ts packages/executable-stories-formatters/src/index.ts
git commit -m "feat(formatters): add Formatter interface and ExecutableStoriesConfig type"
```

---

## Task 2: Config file loader

**Files:**
- Create: `src/config.ts`
- Create: `test/fixtures/config/valid.config.js`
- Create: `test/fixtures/config/no-default.config.js`
- Create: `test/config.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/config.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config.js";

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/config"
);

describe("loadConfig", () => {
  it("returns empty config when config file path does not exist", async () => {
    const config = await loadConfig("/nonexistent/path/executable-stories.config.js");
    expect(config).toEqual({});
  });

  it("loads formatters from a valid config file", async () => {
    const config = await loadConfig(path.join(fixturesDir, "valid.config.js"));
    expect(config.formatters).toBeDefined();
    expect(typeof config.formatters!["test-format"].format).toBe("function");
    expect(config.formatters!["test-format"].name).toBe("test-format");
  });

  it("returns empty config when called with no path and no config file in cwd", async () => {
    // cwd during test run has no executable-stories.config.js
    const config = await loadConfig();
    expect(config).toEqual({});
  });

  it("throws with a clear message when config has no default export", async () => {
    await expect(
      loadConfig(path.join(fixturesDir, "no-default.config.js"))
    ).rejects.toThrow(/must export a default object/);
  });
});
```

- [ ] **Step 2: Create fixture files**

Create `test/fixtures/config/valid.config.js`:

```js
export default {
  formatters: {
    "test-format": {
      name: "test-format",
      fileExtension: "txt",
      format: (run) => `test-format: ${run.testCases.length} tests`,
    },
  },
};
```

Create `test/fixtures/config/no-default.config.js`:

```js
export const notDefault = true;
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
cd packages/executable-stories-formatters
pnpm test -- --reporter=verbose test/config.test.ts
```

Expected: FAIL — `Cannot find module '../src/config.js'`

- [ ] **Step 4: Implement `src/config.ts`**

```ts
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ExecutableStoriesConfig } from "./types/formatter.js";

export async function loadConfig(configPath?: string): Promise<ExecutableStoriesConfig> {
  const resolved = configPath
    ? resolve(configPath)
    : resolve(process.cwd(), "executable-stories.config.js");

  if (!existsSync(resolved)) return {};

  const mod = await import(resolved);
  const config = mod.default;

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error(
      `Config file at ${resolved} must export a default object. Got: ${typeof config}`
    );
  }

  return config as ExecutableStoriesConfig;
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
cd packages/executable-stories-formatters
pnpm test -- --reporter=verbose test/config.test.ts
```

Expected: 4 passing.

- [ ] **Step 6: Commit**

```bash
git add packages/executable-stories-formatters/src/config.ts \
        packages/executable-stories-formatters/test/config.test.ts \
        packages/executable-stories-formatters/test/fixtures/config/valid.config.js \
        packages/executable-stories-formatters/test/fixtures/config/no-default.config.js
git commit -m "feat(formatters): implement config file loader"
```

---

## Task 3: Extend list-scenarios with CSV and markdown-table formats

**Files:**
- Modify: `src/list-scenarios.ts`
- Modify: `test/list-scenarios.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `test/list-scenarios.test.ts` (inside the existing `describe` block):

```ts
  it("outputs CSV format with headers and escaped values", () => {
    const tc = stubs.testCaseResult({
      id: "abc123",
      status: "passed",
      sourceFile: "src/auth/login.test.ts",
      sourceLine: 42,
      story: stubs.storyMeta({ scenario: "Login with valid credentials", tags: ["smoke", "auth"] }),
      tags: ["smoke", "auth"],
    });

    const result = listScenarios({ testCases: [tc], format: "csv" }, {});
    const lines = result.split("\n");

    expect(lines[0]).toBe("id,scenario,status,sourceFile,sourceLine,tags");
    expect(lines[1]).toBe('abc123,Login with valid credentials,passed,src/auth/login.test.ts,42,smoke auth');
  });

  it("CSV escapes values containing commas", () => {
    const tc = stubs.testCaseResult({
      id: "x1",
      status: "failed",
      sourceFile: "src/auth.test.ts",
      sourceLine: 1,
      story: stubs.storyMeta({ scenario: 'User clicks "submit, please"', tags: [] }),
      tags: [],
    });

    const result = listScenarios({ testCases: [tc], format: "csv" }, {});
    const lines = result.split("\n");
    expect(lines[1]).toContain('"User clicks \\"submit, please\\""');
  });

  it("outputs markdown-table format", () => {
    const tc = stubs.testCaseResult({
      status: "passed",
      sourceFile: "src/auth/login.test.ts",
      sourceLine: 42,
      story: stubs.storyMeta({ scenario: "Login with valid credentials", tags: ["smoke"] }),
      tags: ["smoke"],
    });

    const result = listScenarios({ testCases: [tc], format: "markdown-table" }, {});
    const lines = result.split("\n");

    expect(lines[0]).toBe("| Status | Scenario | Location | Tags |");
    expect(lines[1]).toBe("|--------|----------|----------|------|");
    expect(lines[2]).toContain("✅");
    expect(lines[2]).toContain("Login with valid credentials");
    expect(lines[2]).toContain("src/auth/login.test.ts:42");
    expect(lines[2]).toContain("@smoke");
  });

  it("markdown-table leaves tags cell blank when no tags", () => {
    const tc = stubs.testCaseResult({
      status: "failed",
      sourceFile: "src/auth.test.ts",
      sourceLine: 1,
      story: stubs.storyMeta({ scenario: "Fails gracefully", tags: [] }),
      tags: [],
    });

    const result = listScenarios({ testCases: [tc], format: "markdown-table" }, {});
    expect(result).toContain("|  |");
  });
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd packages/executable-stories-formatters
pnpm test -- --reporter=verbose test/list-scenarios.test.ts
```

Expected: FAIL — `format: "csv"` and `format: "markdown-table"` not assignable to type.

- [ ] **Step 3: Implement CSV and markdown-table in `src/list-scenarios.ts`**

Change the `ListScenariosArgs` interface:

```ts
export interface ListScenariosArgs {
  testCases: TestCaseResult[];
  format: "text" | "json" | "csv" | "markdown-table";
}
```

Add the two new format branches inside `listScenarios`, after the `json` branch and before the text format section:

```ts
  if (format === "csv") {
    const header = "id,scenario,status,sourceFile,sourceLine,tags";
    const rows = testCases.map((tc) => {
      const fields = [
        tc.id,
        tc.story.scenario,
        tc.status,
        tc.sourceFile,
        String(tc.sourceLine),
        tc.tags.join(" "),
      ];
      return fields
        .map((f) => {
          if (f.includes(",") || f.includes('"') || f.includes("\n")) {
            return `"${f.replace(/"/g, '\\"')}"`;
          }
          return f;
        })
        .join(",");
    });
    return [header, ...rows].join("\n");
  }

  if (format === "markdown-table") {
    const header = "| Status | Scenario | Location | Tags |";
    const divider = "|--------|----------|----------|------|";
    const rows = testCases.map((tc) => {
      const icon = STATUS_ICONS[tc.status] ?? "?";
      const location = `${tc.sourceFile}:${tc.sourceLine}`;
      const tags = tc.tags.map((t) => `@${t}`).join(" ");
      return `| ${icon} | ${tc.story.scenario} | ${location} | ${tags} |`;
    });
    return [header, divider, ...rows].join("\n");
  }
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd packages/executable-stories-formatters
pnpm test -- --reporter=verbose test/list-scenarios.test.ts
```

Expected: all tests passing (existing + 4 new).

- [ ] **Step 5: Commit**

```bash
git add packages/executable-stories-formatters/src/list-scenarios.ts \
        packages/executable-stories-formatters/test/list-scenarios.test.ts
git commit -m "feat(formatters): add CSV and markdown-table output to list-scenarios"
```

---

## Task 4: Wire list formats into CLI

**Files:**
- Modify: `src/cli.ts`

The list subcommand currently has `--json-summary` (boolean). Replace with `--list-format <format>` and keep `--json-summary` as a deprecated alias.

- [ ] **Step 1: Add `listFormat` to `CliArgs` in `cli.ts`**

Locate the `CliArgs` interface (around line 154). Add after the `jsonSummary` field:

```ts
  listFormat: "text" | "json" | "csv" | "markdown-table";
```

- [ ] **Step 2: Add `--list-format` option to the arg parser**

Locate the `parseArgs` options object (around line 269 where `"json-summary"` is defined). Add:

```ts
      "list-format": { type: "string", default: "text" },
```

- [ ] **Step 3: Map parsed value into `CliArgs`**

Locate where `jsonSummary` is set in the return object (around line 475). Add below it:

```ts
    listFormat: (values["list-format"] as string) as "text" | "json" | "csv" | "markdown-table",
```

- [ ] **Step 4: Update the list subcommand handler**

Locate the list handler (around line 763):

```ts
  if (args.subcommand === "list") {
    const text = await readInput(args);
    const run = applySelection(normalizeRunFromText(text, args).run, args);

    // Use --json-summary to get JSON output for list command
    const outputFormat: "text" | "json" = args.jsonSummary ? "json" : "text";
    const output = listScenarios({ testCases: run.testCases, format: outputFormat }, {});
    console.log(output);
    process.exit(EXIT_SUCCESS);
  }
```

Replace with:

```ts
  if (args.subcommand === "list") {
    const text = await readInput(args);
    const run = applySelection(normalizeRunFromText(text, args).run, args);

    // --json-summary is a deprecated alias for --list-format json
    const resolvedFormat = args.jsonSummary ? "json" : args.listFormat;
    const validListFormats = new Set(["text", "json", "csv", "markdown-table"]);
    if (!validListFormats.has(resolvedFormat)) {
      console.error(`Error: Unknown list format "${resolvedFormat}". Valid: text, json, csv, markdown-table.`);
      process.exit(EXIT_USAGE);
    }
    const output = listScenarios(
      { testCases: run.testCases, format: resolvedFormat as "text" | "json" | "csv" | "markdown-table" },
      {}
    );
    console.log(output);
    process.exit(EXIT_SUCCESS);
  }
```

- [ ] **Step 5: Update help text in `cli.ts`**

Locate the help string section (around line 104). Replace:

```
  --json-summary                Print machine-parsable JSON summary
```

with:

```
  --list-format <format>        list output format: text (default), json, csv, markdown-table
  --json-summary                Deprecated alias for --list-format json
```

Also update lines 113-114:

```
  list prints one scenario per line (--list-format text by default)
  list --list-format json outputs machine-parsable JSON (--json-summary is a deprecated alias)
  list supports --include-tags, --exclude-tags for filtering
  list supports --input-type and --stdin
```

- [ ] **Step 6: Type-check**

```bash
cd packages/executable-stories-formatters
pnpm type-check
```

Expected: no errors.

- [ ] **Step 7: Smoke test**

```bash
cd packages/executable-stories-formatters
echo '{"runId":"r1","startedAtMs":0,"finishedAtMs":1,"durationMs":1,"testCases":[{"id":"t1","status":"passed","story":{"scenario":"Login works","steps":[]},"sourceFile":"src/login.test.ts","sourceLine":1,"tags":["smoke"],"titlePath":["Login"],"durationMs":1}]}' | node dist/cli.js list --list-format csv
```

Expected: CSV output starting with `id,scenario,status,...`

```bash
echo '{"runId":"r1","startedAtMs":0,"finishedAtMs":1,"durationMs":1,"testCases":[{"id":"t1","status":"passed","story":{"scenario":"Login works","steps":[]},"sourceFile":"src/login.test.ts","sourceLine":1,"tags":["smoke"],"titlePath":["Login"],"durationMs":1}]}' | node dist/cli.js list --list-format markdown-table
```

Expected: markdown table output starting with `| Status | Scenario |...`

Note: run `pnpm build` first if `dist/cli.js` is stale.

- [ ] **Step 8: Commit**

```bash
git add packages/executable-stories-formatters/src/cli.ts
git commit -m "feat(formatters): add --list-format flag to list subcommand (csv, markdown-table, json, text)"
```

---

## Task 5: Wire custom formatter plugin API into CLI

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: Import `loadConfig` in `cli.ts`**

Near the top of `cli.ts`, add:

```ts
import { loadConfig } from "./config.js";
```

- [ ] **Step 2: Add `config` option to CliArgs**

In the `CliArgs` interface, add:

```ts
  config?: string;
```

- [ ] **Step 3: Add `--config` option to the arg parser**

In the `parseArgs` options object, add:

```ts
      "config": { type: "string" },
```

- [ ] **Step 4: Map `--config` into `CliArgs`**

In the return object where args are assembled, add:

```ts
    config: values["config"] as string | undefined,
```

- [ ] **Step 5: Load config and allow custom format names**

Locate the format validation block (around line 349):

```ts
  // Parse comma-separated formats
  const validFormats = new Set(["astro", "html", "markdown", "junit", "cucumber-json", "cucumber-messages", "cucumber-html"]);
  const formatStr = values.format as string;
  const formats = formatStr.split(",").map((f) => f.trim()) as OutputFormat[];
  for (const f of formats) {
    if (!validFormats.has(f)) {
      console.error(`Error: Unknown format "${f}". Valid: astro, html, markdown, junit, cucumber-json, cucumber-messages, cucumber-html.`);
      process.exit(EXIT_USAGE);
    }
  }
```

Replace with:

```ts
  // Load config early so custom formatter names can be validated alongside built-ins
  const pluginConfig = await loadConfig(values["config"] as string | undefined);
  const customFormatterNames = new Set(Object.keys(pluginConfig.formatters ?? {}));

  const builtInFormats = new Set(["astro", "html", "markdown", "junit", "cucumber-json", "cucumber-messages", "cucumber-html"]);
  const formatStr = values.format as string;
  const allRequestedFormats = formatStr.split(",").map((f) => f.trim());
  const builtInRequested = allRequestedFormats.filter((f) => builtInFormats.has(f)) as OutputFormat[];
  const customRequested = allRequestedFormats.filter((f) => customFormatterNames.has(f));
  const unknownFormats = allRequestedFormats.filter((f) => !builtInFormats.has(f) && !customFormatterNames.has(f));

  if (unknownFormats.length > 0) {
    const knownCustom = customFormatterNames.size > 0 ? `, ${[...customFormatterNames].join(", ")}` : "";
    console.error(`Error: Unknown format(s): ${unknownFormats.join(", ")}. Valid built-in: astro, html, markdown, junit, cucumber-json, cucumber-messages, cucumber-html${knownCustom}.`);
    process.exit(EXIT_USAGE);
  }

  const formats = builtInRequested;
```

- [ ] **Step 6: Add `runCustomFormatters` helper and call it in all 3 format handler sites**

`cli.ts` has 3 `generateReports` call sites (canonical input, raw input pipeline, and NDJSON input). Add a standalone helper function near the bottom of the file, just above the `dispatchNotifications` function:

```ts
function runCustomFormatters(
  run: TestRunResult,
  customRequested: string[],
  formatters: Record<string, import("./types/formatter.js").Formatter>,
  args: CliArgs
): void {
  if (customRequested.length === 0) return;
  const outputDir = args.outputDir ?? ".";
  for (const formatName of customRequested) {
    const formatter = formatters[formatName];
    try {
      const content = formatter.format(run);
      const ext = formatter.fileExtension ?? formatName;
      const baseName = args.outputName ?? "report";
      const filename = args.outputNameTimestamp
        ? `${baseName}-${Math.floor(run.startedAtMs / 1000)}.${ext}`
        : `${baseName}.${ext}`;
      const filepath = path.join(outputDir, filename);
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(filepath, content, "utf8");
      console.log(`Generated: ${filepath}`);
    } catch (err) {
      console.error(`Error running custom formatter "${formatName}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
```

Then in each of the 3 `try` blocks that call `generateReports`, add the `runCustomFormatters` call immediately after `generateReports` succeeds. There are three identical patterns to update:

**Pattern to find (appears 3 times):**
```ts
    try {
      const result = await generateReports(run, args);  // (or canonical, or with droppedMissingStory)
      await dispatchNotifications(run, args);
```

**Replace each with** (inserting the `runCustomFormatters` call):
```ts
    try {
      const result = await generateReports(run, args);  // keep exact existing signature
      runCustomFormatters(run, customRequested, pluginConfig.formatters ?? {}, args);
      await dispatchNotifications(run, args);
```

Do this for all 3 sites. The variables `customRequested` and `pluginConfig` are in scope at all 3 sites because they are defined earlier in the same top-level async CLI function body.

- [ ] **Step 7: Update help text for `--config` and `--format`**

In the help string, add `--config` to the options section:

```
  --config <path>               Path to executable-stories.config.js (default: ./executable-stories.config.js)
```

Update the `--format` description to mention custom formatters:

```
  --format <formats>            Comma-separated formats: html, markdown, junit, cucumber-json, cucumber-messages, cucumber-html, astro, or custom names from config (default: html)
```

- [ ] **Step 8: Type-check**

```bash
cd packages/executable-stories-formatters
pnpm type-check
```

Expected: no errors.

- [ ] **Step 9: Manual integration test**

Create a temp config file and test the full flow:

```bash
cd packages/executable-stories-formatters
cat > /tmp/es.config.js << 'EOF'
export default {
  formatters: {
    "plain-text": {
      name: "plain-text",
      fileExtension: "txt",
      format: (run) => run.testCases.map(tc => `${tc.status}: ${tc.story.scenario}`).join("\n"),
    },
  },
};
EOF

pnpm build

echo '{"runId":"r1","startedAtMs":0,"finishedAtMs":1,"durationMs":1,"testCases":[{"id":"t1","status":"passed","story":{"scenario":"Login works","steps":[]},"sourceFile":"src/login.test.ts","sourceLine":1,"tags":[],"titlePath":["Login"],"durationMs":1}]}' \
  | node dist/cli.js format --format plain-text --config /tmp/es.config.js --output-dir /tmp

cat /tmp/report.txt
```

Expected output: `passed: Login works`

- [ ] **Step 10: Commit**

```bash
git add packages/executable-stories-formatters/src/cli.ts
git commit -m "feat(formatters): add custom formatter plugin API via executable-stories.config.js"
```

---

## Task 6: Full quality gate

- [ ] **Step 1: Run full pipeline**

```bash
cd /Users/jreehal/dev/js/executable-stories
pnpm quality
```

Expected: build → lint → type-check → test all pass.

- [ ] **Step 2: Commit any lint/type fixes if needed, then tag completion**

```bash
git add -p  # stage any auto-fixes
git commit -m "chore: fix lint/type issues after formatter plugin API"
```
