# vitest-executable-stories

TS-first **story / given / when / then** helpers for Vitest. Author tests in TypeScript; generate **Markdown user-story docs** (Confluence-ready) from the same files.

- **Author:** Use `story()` and call `steps.given()`, `steps.when()`, `steps.then()` inside the callback.
- **Run:** Same files run as normal Vitest tests (one `it` per step).
- **Docs:** A custom reporter writes Markdown with natural-language sections.

No Gherkin files; no Cucumber. You write TypeScript; you get tests and shareable user-story Markdown.

## What this is / isn't

| Yes | No |
| --- | --- |
| TS-first story tests (Vitest tests with step labels) | Not Cucumber, no feature files, no step matching |
| Markdown report generation via reporter | No execution ordering implied by Given/When/Then |
| Vitest-style modifiers on steps | No "world" object or shared context magic |

## Why not Cucumber?

- **No feature files.** Write TypeScript, not Gherkin.
- **No step matching.** Steps are inline functions, not regex-matched definitions.
- **No "world" object.** Use normal TypeScript variables and closures.
- **Still works with Confluence.** The output is clean Markdown you can paste anywhere.

## This is Vitest, not Cucumber

- `story()` is `describe()` with story metadata
- Steps are `it()` tests with keyword labels
- Supports Vitest-style modifiers on steps: `.skip`, `.only`, `.todo`, `.fails`, `.concurrent` (more can be added as Vitest evolves)
- No enforced step ordering: write Given/When/Then in any order
- Filter with `-t`, run with `--watch`, use `vitest-mock-extended`; everything works

**Note on `.concurrent`:** Steps with `.concurrent` may run in parallel. Since step keywords don't enforce execution order, this is Vitest-like behavior, but be aware that parallelism can affect scenarios where steps depend on shared state.

## Developer experience

We aim for a **seamless native Vitest experience**: same lifecycle, same reporting; the only difference is the callback API for steps (see below).

- **Entry point:** Import `story` from `vitest-executable-stories` and use the **callback** pattern: `story("...", (steps) => { steps.given(...); steps.when(...); steps.then(...); })`. This is the primary and recommended pattern. Step functions exist only on the callback `steps` object; there is no top-level `then` export (see "Why no top-level `then`?" below).
- **Mental model:** You are writing a describe and multiple `it()`s with step labels. Each step is one Vitest test; they appear in Vitest's reporter and respect `-t`, `--watch`, and other Vitest options.
- **Modifiers:** `.skip`, `.only`, `.todo`, `.fails`, `.concurrent` work the same as Vitest's step modifiers. Use them on the callback object: `steps.then.skip(...)`, `steps.given.todo(...)`, etc.
- **Framework-native tests:** To attach a story to a plain Vitest test, use `it("...", ({ task }) => { doc.story("Title", task); ... })`. The **`task`** argument is **required** so we can attach the story to this test. Without `task`, the story will not appear in the generated docs. After `doc.story("Title", task)`, other `doc.*` methods in the same test may not be fully reflected in the report; use `story()` with a callback when you need the full doc API.
- **Alternatives for `then`:** If you want a `then`-like name without importing from the package, use the callback parameter: `(steps) => { const { then } = steps; then("...", () => {}); }` or use the module-level `step` object: `import { step } from "vitest-executable-stories"; step.then("...", () => {});` (only inside a `story()` callback).

**Why no top-level `then`?** Tooling that uses `await import("...")` can treat the module namespace as a thenable if it has a `then` property, causing import-time side effects or broken imports. We therefore do not export a top-level `then`; the callback API is the intended, natural way to use steps in Vitest.

**What we guarantee:** Native describe/it, standard modifiers via the callback, and `doc.story("Title", task)` for plain tests (with `task` required). The only intentional difference from Jest/Playwright is the callback-only step API and the `task` argument for framework-native story attachment.

### Common issues

- **No Markdown generated:** Is the reporter in `reporters` in your Vitest config? Did at least one story test run (e.g. a file matching `*.story.test.ts`)? The main entry re-exports BDD helpers that import Vitest; importing it in config can break. Use the `/reporter` entrypoint in config.
- **Story not in docs for a plain `it()`:** Use `doc.story("Title", task)` with `it('...', ({ task }) => { doc.story('Title', task); ... })`. The `task` argument is required.
- **"Step functions must be called inside a story()":** Call `steps.given`/`steps.when`/`steps.then` only inside the callback of `story('...', (steps) => { ... })`.

## Install

```bash
npm install vitest-executable-stories --save-dev
```

Requires **Vitest 4+** (peer dependency).

## Quick start

**1. Write a story test** (`src/auth/login.story.test.ts`):

```ts
import { expect } from "vitest";
import { story } from "vitest-executable-stories";

story("User logs in", (steps) => {
  let page: Page; // Using a browser helper (could be Playwright, Puppeteer, etc.)

  steps.given("user is on login page", async () => {
    page = await browser.newPage();
    await page.goto("/login");
  });

  steps.when("user submits valid credentials", async () => {
    await page.fill('[name="email"]', "user@example.com");
    await page.fill('[name="password"]', "secret");
    await page.click('button[type="submit"]');
  });

  steps.then("user sees the dashboard", async () => {
    expect(page.url()).toContain("/dashboard");
  });
});
```

**2. Add the reporter** in `vitest.config.ts`:

The main entry re-exports BDD helpers that import Vitest; importing it in config can break. Use the **`/reporter`** entrypoint:

```ts
import { defineConfig } from "vitest/config";
import { StoryReporter } from "vitest-executable-stories/reporter";

export default defineConfig({
  test: {
    reporters: ["default", new StoryReporter()],
  },
});
```

When running under Wallaby.js the reporter no-ops (no docs written) so you can keep the same config; tests run normally.

**Wallaby and Vitest 4:** Wallaby's automatic config extraction fails with "Converting circular structure to JSON" when custom reporter instances are in the config. The workaround is to point Wallaby at a separate config file without the reporter.

Create two files in your project root:

**`wallaby.js`:**

```js
export default function () {
  return {
    autoDetect: true,
    testFramework: {
      configFile: "./vitest.wallaby.config.ts",
    },
  };
}
```

**`vitest.wallaby.config.ts`:**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    reporters: ["default"],
  },
});
```

Your main `vitest.config.ts` keeps the `StoryReporter` for normal `vitest run`. Wallaby uses the minimal config and tests run without doc generation.

**3. Run tests:**

```bash
npx vitest run
```

**4. Open `docs/user-stories.md`:**

```markdown
# User Stories

## src/auth/login.story.test.ts

### ✅ User logs in

- **Given** user is on login page
- **When** user submits valid credentials
- **Then** user sees the dashboard
```

Paste into Confluence (or any Markdown renderer) for natural-English user stories.

## Output modes

The reporter supports flexible output configurations:

| Mode | Description | Config |
| ---- | ----------- | ------ |
| **Colocated** (default) | One `.docs.md` file next to each test file | *no config needed* |
| **Aggregated** | All scenarios in one file, grouped by source | `output: "docs/user-stories.md"` |
| **Mixed** | Different rules for different paths | `output: [{ include: "src/**", mode: "colocated" }, { include: "e2e/**", mode: "aggregated", outputFile: "docs/e2e.md" }]` |

### Output configuration

The `output` option accepts either a string (aggregated file path) or an array of rules:

```ts
interface OutputRule {
  /** Glob pattern(s) to match test files */
  include: string | string[];
  /** "aggregated": combine matched scenarios into one file, "colocated": write docs next to each test file */
  mode: "aggregated" | "colocated";
  /** For aggregated mode: output file path */
  outputFile?: string;
  /** For colocated mode: file extension. Default: ".docs.md" */
  extension?: string;
}
```

### Example: Simple colocated (all files)

```ts
new StoryReporter({
  output: [{ include: "**/*.story.test.ts", mode: "colocated" }]
})
// login.story.test.ts → login.story.docs.md (next to test file)
```

### Example: Mixed rules (features colocated, e2e aggregated)

```ts
new StoryReporter({
  output: [
    { include: "src/features/**", mode: "colocated", extension: ".docs.md" },
    { include: "e2e/**", mode: "aggregated", outputFile: "docs/e2e-stories.md" },
    { include: "**/*", mode: "aggregated", outputFile: "docs/other-stories.md" }
  ]
})
```

### Example: Single aggregated file

```ts
new StoryReporter({ output: "docs/user-stories.md" })
```

### Colocated file naming

The reporter strips known test extensions and appends the configured extension:

| Test File | Extension | Output |
| --------- | --------- | ------ |
| `login.story.test.ts` | `.docs.md` (default) | `login.story.docs.md` |
| `login.story.test.ts` | `.md` | `login.story.md` |
| `login.test.ts` | `.docs.md` | `login.docs.md` |
| `checkout.spec.ts` | `.docs.md` | `checkout.docs.md` |

**Rule ordering:** First matching rule wins. Put specific rules before general ones.

**Explicit behavior:** If you provide `output` rules, only those rules apply. Unmatched files are **ignored**. Add a catch-all rule (e.g., `{ include: "**/*", mode: "aggregated", outputFile: "docs/other.md" }`) if you want a fallback. If you don't provide any `output` rules, all scenarios go to the default aggregated file (`docs/user-stories.md`).

### Example aggregated output

Given these test files:

```text
src/
  auth/
    login.story.test.ts      # "User logs in", "User sees error on invalid login"
    logout.story.test.ts     # "User logs out"
  cart/
    checkout.story.test.ts   # "User completes checkout"
```

The reporter generates a single `docs/user-stories.md`:

```markdown
# User Stories

## src/auth/login.story.test.ts

### ✅ User logs in

- **Given** user is on login page
- **When** user submits valid credentials
- **Then** user sees the dashboard

### ✅ User sees error on invalid login

- **Given** user is on login page
- **When** user submits invalid credentials
- **Then** user sees an error message

## src/auth/logout.story.test.ts

### ✅ User logs out

- **Given** user is logged in
- **When** user clicks logout
- **Then** user is redirected to login page

## src/cart/checkout.story.test.ts

### ✅ User completes checkout

- **Given** user has items in cart
- **When** user submits payment
- **Then** order confirmation is displayed
```

Use `groupBy: "none"` for a flat list without file groupings.

## Scenario status icons

Scenarios show a status icon based on step results, with this precedence:

1. ❌ any step failed
2. ✅ all steps passed
3. 📝 all steps are todo
4. ⏩ all steps are skipped
5. ⚠️ mixed (any other combination, e.g., 2 passed + 1 skipped)

## Step modifiers

Vitest-style modifiers are supported on steps:

```ts
import { expect } from "vitest";
import { story } from "vitest-executable-stories";

story("User profile", (steps) => {
  steps.given("user is logged in", () => {
    // setup
  });

  steps.when.skip("user uploads avatar"); // Skipped - not implemented yet

  steps.then.todo("avatar appears in header"); // Placeholder - no function needed

  steps.then.fails("invalid upload shows error", () => {
    throw new Error("Expected to fail");
  });

  steps.then.concurrent("notifications update", async () => {
    // Runs in parallel with other concurrent steps
  });
});
```

**Output:**

```markdown
### 📝 User profile

- **Given** user is logged in
- **When** user uploads avatar _(skipped)_
- **Then** avatar appears in header _(todo)_
- **Then** invalid upload shows error _(expected to fail)_
- **Then** notifications update _(concurrent)_
```

### Available modifiers

| Modifier | Description |
| -------- | ----------- |
| `.skip(text, fn?)` | Skip this step (still documented; body does not run) |
| `.only(text, fn)` | Only run this step (Vitest focus mode) |
| `.todo(text)` | Placeholder step (no function needed) |
| `.fails(text, fn)` | Step expected to fail |
| `.concurrent(text, fn)` | Run step in parallel |

**Note:** `.todo()` is documented as 📝 and does not execute; internally it's registered as skipped to ensure metadata compatibility across Vitest versions.

## Scenario modifiers

Skip or focus entire scenarios:

```ts
import { story } from "vitest-executable-stories";

story.skip("Future feature", (steps) => {
  // Entire story skipped but documented
  steps.given("some precondition", () => {});
  steps.when("something happens", () => {});
  steps.then("expected result", () => {});
});

story.only("Debug this one", (steps) => {
  // Only this story runs
  steps.given("focused story", () => {});
  steps.when("debugging", () => {});
  steps.then("finding the issue", () => {});
});
```

**Output for `story.skip`:**

```markdown
### ⏩ Future feature

- **Given** some precondition
- **When** something happens
- **Then** expected result
```

## Scenario options

Pass options as the second argument:

```ts
import { expect } from "vitest";
import { story } from "vitest-executable-stories";

story(
  "Admin deletes user",
  { tags: ["admin", "critical"], meta: { priority: "high" } },
  (steps) => {
    steps.given("admin is logged in", () => {});
    steps.when("admin clicks delete", () => {});
    steps.then("user is removed", () => {
      expect(true).toBe(true);
    });
  }
);
```

**Output:**

```markdown
### ✅ Admin deletes user

Tags: `admin`, `critical`

- **Given** admin is logged in
- **When** admin clicks delete
- **Then** user is removed
```

Options work with modifiers too:

```ts
story.skip("Future admin feature", { tags: ["admin"] }, (steps) => {
  // ...
});
```

## Rich step documentation

Attach rich documentation (notes, key-value pairs, code blocks, tables, links) to individual steps using the `doc` API. Documentation can be **static** (attached at registration time, visible even for skipped steps) or **runtime** (captures execution-time values).

```ts
import { expect } from "vitest";
import { story } from "vitest-executable-stories";

story("User logs in", (steps) => {
  steps.given("user is on login page", async () => {});
  // Static docs (attached at registration, visible even if step doesn't run)
  steps.doc.note("Using seeded user: user@example.com");

  steps.when("user submits valid credentials", async () => {
    const payload = { email: "user@example.com", password: "secret" };
    // Runtime docs (captures execution-time values)
    steps.doc.runtime.code("Request payload", payload);
  });

  steps.when.skip("user uses SSO");
  // Static doc still appears in output even though step is skipped!
  steps.doc.note("SSO integration pending - see JIRA-123");

  steps.then("user sees the dashboard", async () => {
    const url = "/dashboard";
    expect(url).toContain("/dashboard");
    steps.doc.runtime.kv("Redirected to", url); // Captures actual URL
  });
});
```

**Output:**

```markdown
### ✅ User logs in

- **Given** user is on login page
  _Note:_ Using seeded user: user@example.com
- **When** user submits valid credentials
  **Request payload**

  ```json
  {
    "email": "user@example.com",
    "password": "secret"
  }
  ```

- **When** user uses SSO _(skipped)_
  _Note:_ SSO integration pending - see JIRA-123
- **Then** user sees the dashboard
  **Redirected to:** /dashboard
```

### Doc API methods

| Method | Phase | Description | Works for skipped? |
|--------|-------|-------------|-------------------|
| `doc.note(text)` | Static | Inline note | Yes |
| `doc.kv(label, value)` | Static | Key-value pair | Yes |
| `doc.code(label, content, lang?)` | Static | Code block (default: json) | Yes |
| `doc.json(label, value)` | Static | JSON code block (always serializes) | Yes |
| `doc.table(label, columns, rows)` | Static | Markdown table | Yes |
| `doc.link(label, url)` | Static | Hyperlink | Yes |
| `doc.section(title, markdown)` | Static | Custom section | Yes |
| `doc.runtime.note(text)` | Runtime | Inline note | No |
| `doc.runtime.kv(label, value)` | Runtime | Key-value pair | No |
| `doc.runtime.code(label, content, lang?)` | Runtime | Code block | No |
| `doc.runtime.json(label, value)` | Runtime | JSON code block | No |
| `doc.custom(type, data)` | Static | Custom entry (see [Advanced](#advanced)) | Yes |
| `doc.runtime.custom(type, data)` | Runtime | Custom entry (see [Advanced](#advanced)) | No |

**Static vs Runtime:**
- **Static** (`doc.*`): Attached to the most recently declared step at registration time. Works even for skipped/todo steps.
- **Runtime** (`doc.runtime.*`): Called during step execution, captures actual values. Only works for steps that run.

**Important:** Use `doc.runtime.*` inside step bodies to attach docs to the executing step. This is safe with `.concurrent` steps. Use `doc.*` (static) right after declaring a step for documentation that doesn't depend on execution.

**Runtime docs and skipping:** Runtime docs only appear for steps that actually execute:

```ts
when.skip("user uploads file");
doc.note("This static note WILL appear in docs");
// doc.runtime.note("This runtime note WON'T appear - step is skipped");
```

## Formatting & metadata options

High-value reporter options that improve DX:

```ts
new StoryReporter({
  title: "User Stories",
  description: "Generated from Vitest story tests.",
  includeFrontMatter: true,
  markdown: "gfm", // "gfm" | "commonmark" | "confluence"
  includeMetadata: true,
  includeJson: true,
  includeDurations: false,
  includeEmpty: true,
  sortFiles: "alpha",
  sortScenarios: "alpha",
  filter: {
    // includeTags: ["smoke"],
    // excludeTags: ["wip"],
    // includeFiles: ["src/**"],
    // excludeFiles: ["**/*.skip.*"],
  },
  metadata: {
    date: "iso", // "iso" | "locale" | false
    packageVersion: true,
    gitSha: true,
  },
  json: {
    // outputFile: "docs/user-stories.json",
    includeDocs: "all", // "all" | "static" | "runtime"
  },
  includeSourceLinks: true,
})
```

**Notes:**
- `markdown` controls nested indentation (GFM/CommonMark require 4 spaces under list items).
- `includeSourceLinks` uses `permalinkBaseUrl` if set; disable to omit links. Paths are rendered relative to the Vitest config root (project root).
- Metadata reads the project's `package.json` version when enabled.
- Git SHA is read from `GITHUB_SHA` or the nearest `.git` folder (shortened).
- JSON output is written alongside Markdown by default (same path, `.json` extension).
- JSON metadata includes `repoRoot` (relative to the current working directory).
- Front-matter includes report metadata and counts for machine parsing.
- Coverage summary can be enabled via `coverage: { include: true }`. On Vitest 4+, the reporter uses the `onCoverage` hook when available; otherwise it falls back to reading `coverage/coverage-final.json`. For Vitest 4, set `coverage.include` in your Vitest config if you want coverage in the report (v4 no longer includes all files by default).

## Collate JSON reports (CLI)

If you enable `includeJson`, you can collate all JSON reports into a single index:

```bash
vitest-executable-stories collate --glob "**/*.json" --out docs/story-index.json
```

You can also collate Markdown files with front-matter:

```bash
vitest-executable-stories collate --format md --glob "**/*.md" --out docs/story-index.json
```

Use `--config` to load a JSON config file:

```json
{
  "outFile": "docs/story-index.json",
  "patterns": ["**/*.json"],
  "format": "json"
}
```

### Code blocks

Pass objects to `doc.code()` or `doc.runtime.code()` and they are automatically JSON-serialized:

```ts
when("user submits form", async () => {
  const formData = { name: "John", email: "john@example.com" };
  doc.runtime.code("Form data", formData);
  // or specify a language
  doc.code("SQL query", "SELECT * FROM users", "sql");
});
```

### Tables

Add structured data as markdown tables:

```ts
given("the following users exist", () => {
  doc.table("Users", ["Name", "Role", "Status"], [
    ["Alice", "Admin", "Active"],
    ["Bob", "User", "Pending"],
  ]);
});
```

**Output:**

```markdown
- **Given** the following users exist
  **Users**

  | Name | Role | Status |
  | --- | --- | --- |
  | Alice | Admin | Active |
  | Bob | User | Pending |
```

### Links and sections

```ts
given("system is configured", () => {
  doc.link("Configuration docs", "https://docs.example.com/config");
  doc.section("Prerequisites", "- Node.js 18+\n- Docker installed");
});
```

## AAA pattern aliases

Prefer Arrange/Act/Assert? Use the aliases:

```ts
import { expect } from "vitest";
import { story } from "vitest-executable-stories";

story("Calculator adds numbers", ({ arrange, act, assert }) => {
  let calculator: Calculator;

  arrange("calculator is initialized", () => {
    calculator = new Calculator();
  });

  act("user enters 2 + 2", () => {
    calculator.add(2, 2);
  });

  assert("display shows 4", () => {
    expect(calculator.result).toBe(4);
  });
});
```

**Output:**

```markdown
### ✅ Calculator adds numbers

- **Given** calculator is initialized
- **When** user enters 2 + 2
- **Then** display shows 4
```

### All aliases

| Alias | Maps to |
| ----- | ------- |
| `arrange` | Given |
| `act` | When |
| `assert` | Then |
| `setup` | Given |
| `context` | Given |
| `execute` | When |
| `action` | When |
| `verify` | Then |

All aliases support the same modifiers (`.skip`, `.only`, `.todo`, `.fails`, `.concurrent`).

## Docs without running step bodies

Story metadata is attached at **test registration time** using `it(name, { meta: { story } }, fn)`, so the reporter can read `task.meta.story` without relying on the step body executing. This means the reporter sees story structure even when tests are skipped.

**Use modifiers to document without executing:**

- `given.skip("not implemented yet")` - documented, not run
- `then.todo("will add assertion")` - placeholder in docs
- `story.skip("future feature", ...)` - entire story skipped but documented

**Static vs Runtime docs:** Static docs (`doc.*`) are attached at registration time and appear even for skipped steps. Runtime docs (`doc.runtime.*`) only appear for steps that actually run.

**Note:** Docs generation relies on Vitest collecting/importing test modules so tests are registered. For truly static docs from AST parsing, a future feature would be needed.

## Reporter options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| **title** | string | `"User Stories"` | Report title (first line: `# ${title}`). |
| **output** | `string \| OutputRule[]` | colocated next to test files | Output configuration. String for single aggregated file, array of rules for mixed modes. See [Output modes](#output-modes). |
| **permalinkBaseUrl** | string | *none* | Base URL for source links. If set, each story gets a `Source: [file](url)` line. In GitHub Actions you can leave this unset and we build the URL from env (see [Permalink](#permalink-to-source)). |
| **enableGithubActionsSummary** | boolean | `true` | When `GITHUB_ACTIONS` is set, append the report to the job summary. See [GitHub Actions](#github-actions-summary). |
| **includeSummaryTable** | boolean | `false` | Add a markdown table: start time, duration, story/step counts, and passed/failed/skipped. |
| **groupBy** | `"file"` \| `"none"` | `"file"` | Group scenarios by source file, or show a flat list. |
| **storyHeadingLevel** | `2` \| `3` \| `4` | `3` (file) / `2` (none) | Heading level for story titles. Defaults to `###` when grouping by file, `##` when no grouping. |
| **stepStyle** | `"bullets"` \| `"gherkin"` | `"bullets"` | Render steps as bullet points or Gherkin-style (no bullets). Note: `"gherkin"` is just a rendering option; no Gherkin parsing or feature files. |
| **includeStatus** | boolean | `true` | Include status icons (✅❌⏩📝) on story headings. |
| **includeErrorInMarkdown** | boolean | `true` | Include failure error in markdown for failed scenarios. |
| **customRenderers** | `Record<string, CustomDocRenderer>` | *none* | Custom renderers for `doc.custom()` entries, keyed by type. See [Advanced](#advanced). |

### Vitest 4

- **Output:** Use the `output` option for the report destination, not `outputFile`. Example: `new StoryReporter({ output: "docs/user-stories.md" })`.
- **Coverage:** When `coverage.include` is true, the reporter uses Vitest’s `onCoverage` hook when available (Vitest 4+) and falls back to reading `coverage/coverage-final.json` otherwise. In Vitest 4, set `coverage.include` in your Vitest config if you want a coverage summary in the story report.
- **Interrupted runs:** If the test run ends with reason `interrupted` (e.g. Ctrl+C or `vitest.cancelCurrentRun()`), the reporter does not write report files so the output is not misleading.

## Permalink to source

If you set **`permalinkBaseUrl`**, each story in the report gets a source link, e.g.:

```markdown
## ✅ User logs in
Source: [login.story.test.ts](https://github.com/org/repo/blob/abc123/login.story.test.ts)
- **Given** user is on login page
...
```

- **Option:** Set `permalinkBaseUrl` in config (e.g. in CI from env:
  `process.env.GITHUB_SERVER_URL + '/' + process.env.GITHUB_REPOSITORY + '/blob/' + process.env.GITHUB_SHA + '/'`).
- **GitHub Actions fallback:** If `permalinkBaseUrl` is not set and `GITHUB_ACTIONS` is set, the reporter builds the base URL from `GITHUB_SERVER_URL`, `GITHUB_REPOSITORY`, `GITHUB_SHA`, and the project root so source links work without extra config.

## GitHub Actions summary

When **`enableGithubActionsSummary`** is `true` (default) and `process.env.GITHUB_ACTIONS === 'true'`, the reporter appends the generated Markdown to the GitHub Actions job summary so it appears on the run page.

- If `@actions/core` is available (installed in the repo), we append to the job summary. Otherwise, we silently skip summary output and still write the Markdown file.
- To disable: `new StoryReporter({ enableGithubActionsSummary: false })`.

## API

### story(title, define)

### story(title, options, define)

Defines a story (Vitest `describe`). `define(steps)` receives a steps object; use `steps.given()`, `steps.when()`, `steps.then()`, `steps.and()`, and `steps.doc` to define steps and documentation.

**Modifiers:** `story.skip(...)`, `story.only(...)`

### Step functions

`given(text, fn)` / `when(text, fn)` / `then(text, fn)` / `and(text, fn)`

Register a step (Vitest `it`) and attach story meta for the reporter.

**Modifiers:** `.skip(text, fn?)`, `.only(text, fn)`, `.todo(text)`, `.fails(text, fn)`, `.concurrent(text, fn)`

### StoryReporter(options?)

Reporter that collects `task.meta.story` and writes Markdown. See [Reporter options](#reporter-options).

**In `vitest.config.ts`:** Import from `vitest-executable-stories/reporter` (not the main package) so Vitest is not loaded in the config context, which would cause "Vitest failed to access its internal state".

## Types

```ts
import type {
  StepKeyword,      // "Given" | "When" | "Then" | "And"
  StepMode,         // "normal" | "skip" | "only" | "todo" | "fails" | "concurrent"
  StoryStep,        // { keyword, text, mode?, docs? }
  StoryMeta,        // { story, steps, tags?, meta? }
  ScenarioOptions,  // { tags?, meta? }
  StepsApi,         // { given, when, then, and, arrange, act, assert, ..., doc }
  StepFn,           // Step function with modifiers
  ScenarioFn,       // Scenario function with modifiers
  DocEntry,         // Union type for doc entries (note, kv, code, table, link, section, custom)
  DocPhase,         // "static" | "runtime"
  DocApi,           // Full doc API with static + runtime methods
  DocRuntimeApi,    // Runtime-only doc methods (note, kv, code, json, custom)
  StoryReporterOptions,
  OutputRule,       // { include, mode, outputFile?, extension? }
  CustomDocRenderer, // Custom renderer function for doc.custom() entries
} from "vitest-executable-stories";
```

## How it works

- Helpers wrap Vitest's `describe` and `it`; each step is one test so you get normal Vitest output and filtering.
- The `define` function runs synchronously, collecting step definitions. After `define()` completes, a single `StoryMeta` snapshot is created and shared by all steps.
- Each step is registered with `it(name, { meta: { story } }, fn)` so the reporter can read `task.meta.story` without relying on the step body executing.
- The reporter uses **`onInit(ctx)`** to store the Vitest context and start time (for duration and root path), **`onCoverage(coverage)`** when coverage is enabled (Vitest 4+) to receive coverage for the summary, and **`onTestRunEnd`** (with Vitest 4’s `TestRunEndReason`) to walk all test modules, collect `meta.story`, derive pass/fail/skip from test results, and write Markdown. If the run ends with reason `interrupted`, no files are written.
- Scenarios are keyed by `(file + story title)` to prevent collisions when the same story title appears in different files.

## Advanced

### Custom doc entries

Use `doc.custom(type, data)` for extensibility. Custom entries are rendered as JSON by default, or you can provide custom renderers:

```ts
// In your test
when("user performs action", () => {
  doc.custom("screenshot", { path: "screenshots/action.png", alt: "Action result" });
  doc.custom("metric", { name: "response_time", value: 150, unit: "ms" });
});
```

**Default output** (renders as JSON):

```markdown
- **When** user performs action
  **[screenshot]**

  ```json
  {
    "path": "screenshots/action.png",
    "alt": "Action result"
  }
  ```
```

**Custom renderer** in `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { StoryReporter, CustomDocRenderer } from "vitest-executable-stories/reporter";

const screenshotRenderer: CustomDocRenderer = (entry, lines, indent) => {
  const { path, alt } = entry.data as { path: string; alt: string };
  lines.push(`${indent}![${alt}](${path})`);
};

const metricRenderer: CustomDocRenderer = (entry, lines, indent) => {
  const { name, value, unit } = entry.data as { name: string; value: number; unit: string };
  lines.push(`${indent}**${name}:** ${value} ${unit}`);
};

export default defineConfig({
  test: {
    reporters: [
      "default",
      new StoryReporter({
        customRenderers: {
          screenshot: screenshotRenderer,
          metric: metricRenderer,
        },
      }),
    ],
  },
});
```

**Custom rendered output:**

```markdown
- **When** user performs action
  ![Action result](screenshots/action.png)
  **response_time:** 150 ms
```

## Testing

The reporter is tested the same way as [vitest-markdown-reporter](https://github.com/pecirep/vitest-markdown-reporter): **integration tests** that run Vitest with a fixture config, then assert the generated report.

- **`npm run test`** runs `build` then Vitest. It runs the main story tests and an integration test in `src/__tests__/reporter.test.ts`.
- The integration test **spawns** Vitest with `--config=src/__tests__/fixtures/vitest.config.mts`. That config runs only a minimal fixture story test and uses `StoryReporter` with output to `src/__tests__/fixtures/dist/user-stories.md`.
- After the spawned run finishes, the test **reads** that file and asserts it contains the expected structure: title, story header, and step lines (`**Given**`, `**When**`, `**Then**`).

So we don't mock Vitest's reporter API; we run a real Vitest process that uses the reporter and then check the written output. That catches regressions in both the reporter logic and the fixture story flow.

## License

MIT
