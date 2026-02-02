# playwright-executable-stories

TS-first **scenario / given / when / then** helpers for Playwright. Author tests in TypeScript; generate **Markdown user-story docs** (Confluence-ready) from the same files.

- **Author:** Use `scenario()`, `given()`, `when()`, `then()`, `and()` in your `.spec.ts` files.
- **Run:** Same files run as normal Playwright tests (one `test()` per step).
- **Docs:** A custom reporter reads story-docs annotations and writes Markdown with natural-language sections.

No Gherkin files; no Cucumber. You write TypeScript; you get tests and shareable user-story Markdown.

## What this is / isn't

| Yes | No |
| --- | --- |
| TS-first story tests (Playwright tests with step labels) | Not Cucumber, no feature files, no step matching |
| Markdown report generation via reporter | No execution ordering implied by Given/When/Then |
| Playwright-style modifiers on steps | No "world" object or shared context magic |

## Why not Cucumber?

- **No feature files.** Write TypeScript, not Gherkin.
- **No step matching.** Steps are inline functions, not regex-matched definitions.
- **No "world" object.** Use normal TypeScript variables and closures.
- **Still works with Confluence.** The output is clean Markdown you can paste anywhere.

## This is Playwright, not Cucumber

- `scenario()` is `test.describe()` with story metadata stored in annotations
- Steps are `test()` with keyword labels and a `story-docs` annotation
- Playwright modifiers on steps: `.skip`, `.only`, `.fixme`, `.fail`, `.slow`, `.todo`
- Scenario modifiers: `scenario.skip`, `scenario.only`, `scenario.fixme`, `scenario.slow`
- Step callbacks receive Playwright fixtures (e.g. `{ page }`)
- Reporter reads annotations from test results and writes Markdown

## Install

```bash
npm install playwright-executable-stories --save-dev
```

Requires **@playwright/test 1.40+** (peer dependency).

## Quick start

**1. Write a story test** (e.g. `login.story.spec.ts`):

```ts
import { scenario } from "playwright-executable-stories";
import { expect } from "@playwright/test";

scenario("User logs in", ({ given, when, then }) => {
  given("user is on login page", async ({ page }) => {
    await page.goto("/login");
  });
  when("user submits valid credentials", async ({ page }) => {
    await page.fill("[name=email]", "user@example.com");
    await page.click("button[type=submit]");
  });
  then("user sees the dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

**2. Add the reporter** in `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  reporter: [
    ["list"],
    ["playwright-executable-stories/reporter", { output: "docs/user-stories.md" }],
  ],
  use: { ...devices["Desktop Chrome"] },
});
```

**3. Run tests:**

```bash
npx playwright test
```

**4. Open the docs output** (colocated by default, or the aggregated file you configured):

```markdown
# User Stories

## login.story.spec.ts

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
  /** "aggregated": combine matched scenarios into one file; "colocated": write docs next to each test file */
  mode: "aggregated" | "colocated";
  /** For aggregated mode: output file path */
  outputFile?: string;
  /** For colocated mode: file extension. Default: ".docs.md" */
  extension?: string;
}
```

### Example: Simple colocated (all files)

```ts
reporter: [
  ["list"],
  ["playwright-executable-stories/reporter", {
    output: [{ include: "**/*.story.spec.ts", mode: "colocated" }]
  }],
]
// login.story.spec.ts → login.story.docs.md (next to test file)
```

### Example: Mixed rules (features colocated, e2e aggregated)

```ts
reporter: [
  ["list"],
  ["playwright-executable-stories/reporter", {
    output: [
      { include: "src/features/**", mode: "colocated", extension: ".docs.md" },
      { include: "e2e/**", mode: "aggregated", outputFile: "docs/e2e-stories.md" },
      { include: "**/*", mode: "aggregated", outputFile: "docs/other-stories.md" }
    ]
  }],
]
```

### Example: Single aggregated file

```ts
reporter: [
  ["list"],
  ["playwright-executable-stories/reporter", { output: "docs/user-stories.md" }],
]
```

### Colocated file naming

The reporter strips known test extensions and appends the configured extension:

| Test File | Extension | Output |
| --------- | --------- | ------ |
| `login.story.spec.ts` | `.docs.md` (default) | `login.story.docs.md` |
| `login.story.spec.ts` | `.md` | `login.story.md` |
| `login.spec.ts` | `.docs.md` | `login.docs.md` |
| `checkout.spec.ts` | `.docs.md` | `checkout.docs.md` |

**Rule ordering:** First matching rule wins. Put specific rules before general ones.

**Explicit behavior:** If you provide `output` rules, only those rules apply. Unmatched files are **ignored**. Add a catch-all rule (e.g., `{ include: "**/*", mode: "aggregated", outputFile: "docs/other.md" }`) if you want a fallback. If you don't provide any `output` rules, all scenarios are written as colocated `.docs.md` files.

## Example aggregated output

Given these test files:

```text
src/
  auth/
    login.story.spec.ts      # "User logs in", "User sees error on invalid login"
    logout.story.spec.ts     # "User logs out"
  cart/
    checkout.story.spec.ts   # "User completes checkout"
```

The reporter generates a single `docs/user-stories.md`:

```markdown
# User Stories

## src/auth/login.story.spec.ts

### ✅ User logs in

- **Given** user is on login page
- **When** user submits valid credentials
- **Then** user sees the dashboard

### ✅ User sees error on invalid login

- **Given** user is on login page
- **When** user submits invalid credentials
- **Then** user sees an error message

## src/auth/logout.story.spec.ts

### ✅ User logs out

- **Given** user is logged in
- **When** user clicks logout
- **Then** user is redirected to login page

## src/cart/checkout.story.spec.ts

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
3. 📝 all steps are todo or fixme
4. ⏩ all steps are skipped
5. ⚠️ mixed (any other combination, e.g., 2 passed + 1 skipped)

## Step modifiers

Playwright-style modifiers are supported on steps:

```ts
scenario("User profile", ({ given, when, then }) => {
  given("user is logged in", async ({ page }) => {
    // setup
  });

  when.skip("user uploads avatar"); // Skipped - not implemented yet

  then.fixme("avatar appears in header"); // Fixme - won't run

  then.fail("invalid upload shows error", async ({ page }) => {
    throw new Error("Expected to fail");
  });

  then.slow("heavy export runs", async ({ page }) => {
    // 3x timeout
  });

  then.todo("will add assertion"); // Placeholder - no function needed
});
```

**Output:**

```markdown
### 📝 User profile

- **Given** user is logged in
- **When** user uploads avatar _(skipped)_
- **Then** avatar appears in header _(fixme)_
- **Then** invalid upload shows error _(expected to fail)_
- **Then** heavy export runs _(slow)_
- **Then** will add assertion _(todo)_
```

### Available modifiers

| Modifier | Description |
| -------- | ----------- |
| `.skip(text, fn?)` | Skip this step (still documented; body does not run) |
| `.only(text, fn)` | Only run this step (Playwright focus mode) |
| `.fixme(text, fn?)` | Mark step fixme (won't run) |
| `.todo(text)` | Placeholder step (no function needed) |
| `.fail(text, fn)` | Step expected to fail |
| `.slow(text, fn)` | Step gets 3x timeout |

## Scenario modifiers

Skip or focus entire scenarios:

```ts
scenario.skip("Future feature", ({ given, when, then }) => {
  // Entire scenario skipped but documented
  given("some precondition", async ({ page }) => {});
  when("something happens", async ({ page }) => {});
  then("expected result", async ({ page }) => {});
});

scenario.only("Debug this one", ({ given, when, then }) => {
  // Only this scenario runs
  given("focused scenario", async ({ page }) => {});
  when("debugging", async ({ page }) => {});
  then("finding the issue", async ({ page }) => {});
});

scenario.fixme("Broken scenario", ({ given, when, then }) => {
  // All steps skipped
});

scenario.slow("Slow scenario", ({ given, when, then }) => {
  // All steps get extended timeout
});
```

## Scenario options

Pass options as the second argument:

```ts
scenario(
  "Admin deletes user",
  { tags: ["admin", "critical"], ticket: ["JIRA-123"], meta: { priority: "high" } },
  ({ given, when, then }) => {
    given("admin is logged in", async ({ page }) => {});
    when("admin clicks delete", async ({ page }) => {});
    then("user is removed", async ({ page }) => {});
  }
);
```

**Output:**

```markdown
### ✅ Admin deletes user

Tags: `admin`, `critical`
Tickets: `JIRA-123`

- **Given** admin is logged in
- **When** admin clicks delete
- **Then** user is removed
```

Options work with modifiers too:

```ts
scenario.skip("Future admin feature", { tags: ["admin"] }, ({ given, when, then }) => {
  // ...
});
```

## Rich step documentation

Attach rich documentation (notes, key-value pairs, code blocks, tables, links, diagrams, screenshots) to individual steps using the `doc` API. Documentation can be **static** (attached at registration time, visible even for skipped steps) or **runtime** (captures execution-time values).

```ts
scenario("User logs in", ({ given, when, then, doc }) => {
  given("user is on login page", async () => {});
  // Static docs (attached at registration, visible even if step doesn't run)
  doc.note("Using seeded user: user@example.com");

  when("user submits valid credentials", async () => {
    const payload = { email: "user@example.com", password: "secret" };
    // Runtime docs (captures execution-time values)
    doc.runtime.code("Request payload", payload);
  });

  when.skip("user uses SSO");
  // Static doc still appears in output even though step is skipped!
  doc.note("SSO integration pending - see JIRA-123");

  then("user sees the dashboard", async () => {
    const url = "/dashboard";
    doc.runtime.kv("Redirected to", url); // Captures actual URL
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
| `doc.mermaid(code, title?)` | Static | Mermaid diagram | Yes |
| `doc.screenshot(path, alt?)` | Static | Screenshot image | Yes |
| `doc.runtime.note(text)` | Runtime | Inline note | No |
| `doc.runtime.kv(label, value)` | Runtime | Key-value pair | No |
| `doc.runtime.code(label, content, lang?)` | Runtime | Code block | No |
| `doc.runtime.json(label, value)` | Runtime | JSON code block | No |
| `doc.runtime.mermaid(code, title?)` | Runtime | Mermaid diagram | No |
| `doc.runtime.screenshot(path, alt?)` | Runtime | Screenshot image | No |
| `doc.custom(type, data)` | Static | Custom entry (see Advanced) | Yes |
| `doc.runtime.custom(type, data)` | Runtime | Custom entry (see Advanced) | No |

**Static vs Runtime:**
- **Static** (`doc.*`): Attached to the most recently declared step at registration time. Works even for skipped/todo steps.
- **Runtime** (`doc.runtime.*`): Called during step execution, captures actual values. Only works for steps that run.

**Runtime docs and skipping:** Runtime docs only appear for steps that actually execute:

```ts
when.skip("user uploads file");
doc.note("This static note WILL appear in docs");
// doc.runtime.note("This runtime note WON'T appear - step is skipped");
```

## Formatting & metadata options

High-value reporter options that improve DX:

```ts
reporter: [
  ["list"],
  ["playwright-executable-stories/reporter", {
    title: "User Stories",
    description: "Generated from Playwright story tests.",
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
    ticketUrlTemplate: "https://jira.example.com/browse/{ticket}",
    coverage: { include: false },
  }],
]
```

**Notes:**
- `markdown` controls nested indentation (GFM/CommonMark require 4 spaces under list items).
- `includeSourceLinks` uses `permalinkBaseUrl` if set; disable to omit links. Paths are rendered relative to the Playwright config root.
- Metadata reads the project's `package.json` version when enabled.
- Git SHA is read from `GITHUB_SHA` or the nearest `.git` folder (shortened).
- JSON output is written alongside Markdown by default (same path, `.json` extension).
- JSON metadata includes `repoRoot` (relative to the current working directory).
- Front-matter includes report metadata and counts for machine parsing.
- Coverage summary can be enabled via `coverage: { include: true }` (reads `coverage/coverage-final.json`).

## Collate JSON reports (CLI)

If you enable `includeJson`, you can collate all JSON reports into a single index:

```bash
playwright-executable-stories collate --glob "**/*.json" --out docs/story-index.json
```

You can also collate Markdown files with front-matter:

```bash
playwright-executable-stories collate --format md --glob "**/*.md" --out docs/story-index.json
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

### Links and sections

```ts
given("system is configured", () => {
  doc.link("Configuration docs", "https://docs.example.com/config");
  doc.section("Prerequisites", "- Node.js 18+\n- Docker installed");
});
```

### Mermaid diagrams

```ts
then("flow is documented", () => {
  doc.mermaid("graph LR\n  A-->B", "Login flow");
});
```

### Screenshots

```ts
then("screen is captured", async () => {
  doc.runtime.screenshot("screenshots/login.png", "Login form");
});
```

## AAA pattern aliases

Prefer Arrange/Act/Assert? Use the aliases:

```ts
scenario("Calculator adds numbers", ({ arrange, act, assert }) => {
  let calculator: Calculator;

  arrange("calculator is initialized", async ({ page }) => {
    calculator = new Calculator();
  });

  act("user enters 2 + 2", async ({ page }) => {
    calculator.add(2, 2);
  });

  assert("display shows 4", async ({ page }) => {
    expect(calculator.result).toBe(4);
  });
});
```

Aliases: `arrange` (Given), `act` (When), `assert` (Then), `setup`, `context`, `execute`, `action`, `verify`.

## Docs without running step bodies

Story metadata is attached at **test registration time** using `test(name, { annotation: [{ type: 'story-docs', description: JSON.stringify(story) }] }, fn)`, so the reporter can read the story without relying on the step body executing. This means the reporter sees scenario structure even when tests are skipped.

**Use modifiers to document without executing:**

- `given.skip("not implemented yet")` - documented, not run
- `then.todo("will add assertion")` - placeholder in docs
- `scenario.skip("future feature", ...)` - entire scenario skipped but documented

## Reporter options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| **title** | string | `"User Stories"` | Report title (first line: `# ${title}`). |
| **description** | string | `""` | Optional paragraph under the title. |
| **includeFrontMatter** | boolean | `false` | Include YAML front-matter for machine parsing. |
| **output** | `string \| OutputRule[]` | colocated next to test files | Output configuration. String for single aggregated file, array of rules for mixed modes. See Output modes. |
| **permalinkBaseUrl** | string | *none* | Base URL for source links. If set, each scenario gets a `Source: [file](url)` line. In GitHub Actions you can leave this unset and we build the URL from env (see Permalink). |
| **enableGithubActionsSummary** | boolean | `true` | When `GITHUB_ACTIONS` is set, append the report to the job summary. |
| **includeSummaryTable** | boolean | `false` | Add a markdown table: start time, duration, scenario/step counts, and passed/failed/skipped. |
| **includeMetadata** | boolean | `true` | Add metadata block with date/version/git SHA (configurable). |
| **includeJson** | boolean | `false` | Emit a JSON report alongside Markdown. |
| **groupBy** | `"file" \| "none"` | `"file"` | Group scenarios by source file, or show a flat list. |
| **scenarioHeadingLevel** | `2` \| `3` \| `4` | `3` (file) / `2` (none) | Heading level for scenario titles. |
| **stepStyle** | `"bullets" \| "gherkin"` | `"bullets"` | Render steps as bullet points or Gherkin-style (no bullets). |
| **markdown** | `"gfm" \| "commonmark" \| "confluence"` | `"gfm"` | Markdown dialect (indentation for nested blocks). |
| **includeStatus** | boolean | `true` | Include status icons (✅❌⏩📝⚠️) on scenario headings. |
| **includeDurations** | boolean | `false` | Include per-scenario durations in markdown. |
| **includeEmpty** | boolean | `true` | Write output even when no scenarios matched. |
| **sortFiles** | `"alpha" \| "source" \| "none"` | `"alpha"` | Sorting for file groups. |
| **sortScenarios** | `"alpha" \| "source" \| "none"` | `"alpha"` | Sorting for scenarios within a file. |
| **filter** | object | `{}` | Filter by tags/files. |
| **includeSourceLinks** | boolean | `true` | Include source links when `permalinkBaseUrl` is set. |
| **ticketUrlTemplate** | string | *none* | Template for ticket links. Use `{ticket}` as placeholder. |
| **customRenderers** | `Record<string, CustomDocRenderer>` | *none* | Custom renderers for `doc.custom()` entries. See Advanced. |

## Permalink to source

If you set **`permalinkBaseUrl`**, each scenario in the report gets a source link, e.g.:

```markdown
## ✅ User logs in
Source: [login.story.spec.ts](https://github.com/org/repo/blob/abc123/login.story.spec.ts)
- **Given** user is on login page
...
```

- **Option:** Set `permalinkBaseUrl` in config (e.g. in CI from env:
  `process.env.GITHUB_SERVER_URL + '/' + process.env.GITHUB_REPOSITORY + '/blob/' + process.env.GITHUB_SHA + '/'`).
- **GitHub Actions fallback:** If `permalinkBaseUrl` is not set and `GITHUB_ACTIONS` is set, the reporter builds the base URL from `GITHUB_SERVER_URL`, `GITHUB_REPOSITORY`, `GITHUB_SHA`, and the project root so source links work without extra config.

## GitHub Actions summary

When **`enableGithubActionsSummary`** is `true` (default) and `process.env.GITHUB_ACTIONS === 'true'`, the reporter appends the generated Markdown to the GitHub Actions job summary so it appears on the run page.

- If `@actions/core` is available (installed in the repo), we append to the job summary. Otherwise, we silently skip summary output and still write the Markdown file.
- To disable: set `{ enableGithubActionsSummary: false }` in the reporter options.

## API

- **`scenario(title, define)`** / **`scenario(title, options, define)`** – Defines a scenario (Playwright `test.describe`). Modifiers: `scenario.skip`, `scenario.only`, `scenario.fixme`, `scenario.slow`.
- **`given` / `when` / `then` / `and`** – Register a step (Playwright `test`) with story-docs annotation. Modifiers: `.skip`, `.only`, `.fixme`, `.todo`, `.fail`, `.slow`.
- **`StoryReporter(options?)`** – Reporter module that collects annotations and writes Markdown (configured via Playwright reporter options).

## Types

```ts
import type {
  StepKeyword,
  StepMode,
  StoryStep,
  StoryMeta,
  ScenarioOptions,
  StepsApi,
  StepFn,
  ScenarioFn,
  PlaywrightTestArgs,
  DocEntry,
  DocPhase,
  DocApi,
  DocRuntimeApi,
  StoryReporterOptions,
  OutputRule,
  CustomDocRenderer,
} from "playwright-executable-stories";
```

## How it works

- Helpers wrap Playwright's `test.describe` and `test`; each step is one test so you get normal Playwright output and filtering.
- The `define` function runs synchronously, collecting step definitions. After `define()` completes, a single `StoryMeta` snapshot is created and shared by all steps.
- Each step is registered with `test(name, { annotation: [{ type: 'story-docs', description: JSON.stringify(storyMeta) }] }, fn)` so the reporter can read story metadata without relying on the step body executing.
- The reporter implements Playwright's `Reporter` interface: `onBegin` stores config and start time; `onTestEnd` reads `result.annotations` for type `story-docs`, parses `StoryMeta`, and aggregates by (sourceFile, scenario); `onEnd` routes scenarios to output files (via output rules or default), renders Markdown, and writes one or more files. Scenarios are keyed by (sourceFile, scenario title).

## Advanced

### Custom doc entries

Use `doc.custom(type, data)` for extensibility. Custom entries are rendered as JSON by default, or you can provide custom renderers:

```ts
when("user performs action", async () => {
  doc.custom("screenshot", { path: "screenshots/action.png", alt: "Action result" });
  doc.custom("metric", { name: "response_time", value: 150, unit: "ms" });
});
```

**Custom renderer** in `playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";
import type { CustomDocRenderer } from "playwright-executable-stories";

const screenshotRenderer: CustomDocRenderer = (entry, lines, indent) => {
  const { path, alt } = entry.data as { path: string; alt: string };
  lines.push(`${indent}![${alt}](${path})`);
};

const metricRenderer: CustomDocRenderer = (entry, lines, indent) => {
  const { name, value, unit } = entry.data as { name: string; value: number; unit: string };
  lines.push(`${indent}**${name}:** ${value} ${unit}`);
};

export default defineConfig({
  reporter: [
    ["list"],
    ["playwright-executable-stories/reporter", {
      output: "docs/user-stories.md",
      customRenderers: { screenshot: screenshotRenderer, metric: metricRenderer },
    }],
  ],
});
```

## Linting

We recommend TypeScript + ESLint for your project. Enable **`@typescript-eslint/no-floating-promises`** so async Playwright calls (e.g. `page.click()`) must be awaited. Optionally use **[eslint-plugin-playwright](https://github.com/playwright-community/eslint-plugin-playwright)** for Playwright-specific rules (e.g. no `.only` in CI, no `page` in `test.describe`).

## Testing

Integration test: run Playwright with a fixture config that uses `StoryReporter`, then assert the generated Markdown file contains the expected title, scenario header, and step lines.

## License

MIT
