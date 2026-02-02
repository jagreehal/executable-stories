# jest-executable-stories

TS-first **story / given / when / then** helpers for Jest. Author tests in TypeScript; generate **Markdown user-story docs** (Confluence-ready) from the same files.

- **Author:** Use `story()`, `given()`, `when()`, `then()`, `and()` in your `.test.ts` files.
- **Run:** Same files run as normal Jest tests (one `test` per step).
- **Docs:** A custom reporter writes Markdown with natural-language sections.

No Gherkin files; no Cucumber. You write TypeScript; you get tests and shareable user-story Markdown.

## What this is / isn't

| Yes | No |
| --- | --- |
| TS-first story tests (Jest tests with step labels) | Not Cucumber, no feature files, no step matching |
| Markdown report generation via reporter | No execution ordering implied by Given/When/Then |
| Jest-style modifiers on steps | No "world" object or shared context magic |

## Why not Cucumber?

- **No feature files.** Write TypeScript, not Gherkin.
- **No step matching.** Steps are inline functions, not regex-matched definitions.
- **No "world" object.** Use normal TypeScript variables and closures.
- **Still works with Confluence.** The output is clean Markdown you can paste anywhere.

## This is Jest, not Cucumber

- `story()` is `describe()` with story metadata
- Steps are `test()` cases with keyword labels
- Supports Jest-style modifiers on steps: `.skip`, `.only`, `.todo`, `.fails`, `.concurrent` (more can be added as Jest evolves)
- No enforced step ordering: write Given/When/Then in any order
- Filter with `-t`, run with `--watch`, use `jest-mock-extended`; everything works

**Note on `.concurrent`:** Steps with `.concurrent` may run in parallel. Since step keywords don't enforce execution order, this is Jest-like behavior, but be aware that parallelism can affect scenarios where steps depend on shared state.

## Developer experience

We aim for a **seamless native Jest experience**: same lifecycle, same reporting, no extra runner or "world" object.

- **Entry point:** Import `story`, `given`, `when`, `then` from `jest-executable-stories` and `expect` from `@jest/globals`. Nothing else is required; there is no separate story runner.
- **Mental model:** You are writing `describe()` + `test()` with readable step labels. Each step is one Jest test; they appear in Jest's reporter and respect `-t`, `--watch`, and other Jest options.
- **Modifiers:** `.skip`, `.only`, `.todo`, `.fails`, `.concurrent` behave like Jest's `test.skip` / `test.only` / etc. No custom semantics.
- **Framework-native tests:** Use plain `test("...", () => { doc.story("Title"); ... })` to attach a story title to a regular Jest test so it appears in the generated docs. Suite path in docs (e.g. `## Suite name`) only appears when Jest's `currentTestName` contains `" > "`; with the default Jest setup this is often not the case, so docs are flat unless you configure test name formatting.
- **Reporter:** Add `["jest-executable-stories/reporter", { output: "docs/user-stories.md" }]` to `reporters` in your Jest config. Markdown is written as a side effect of the same test run; no separate doc-only run.

**What we guarantee:** Native describe/test, standard modifiers, and `doc.story()` for plain tests. The only intentional difference is how we group scenarios in the generated Markdown (by story title and file).

### Common issues

- **No Markdown generated:** Is the reporter in `reporters` in your Jest config? Did at least one story test run (e.g. a file matching `*.story.test.ts`)?
- **"Step functions must be called inside a story()":** Call `given`/`when`/`then` only inside the callback of `story('...', () => { ... })`.

## Install

```bash
npm install jest-executable-stories --save-dev
```

Requires **Jest 29+** (peer dependency).

## Quick start

**1. Write a story test** (`src/auth/login.story.test.ts`):

```ts
import { expect } from "@jest/globals";
import { story, given, when, then } from "jest-executable-stories";

story("User logs in", () => {
  let page: Page; // Using a browser helper (could be Playwright, Puppeteer, etc.)

  given("user is on login page", async () => {
    page = await browser.newPage();
    await page.goto("/login");
  });

  when("user submits valid credentials", async () => {
    await page.fill('[name="email"]', "user@example.com");
    await page.fill('[name="password"]', "secret");
    await page.click('button[type="submit"]');
  });

  then("user sees the dashboard", async () => {
    expect(page.url()).toContain("/dashboard");
  });
});
```

**2. Add the reporter** in `jest.config.ts`:

```ts
export default {
  reporters: ["default", ["jest-executable-stories/reporter", { output: "docs/user-stories.md" }]],
};
```

**3. Run tests:**

```bash
npx jest
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
export default {
  reporters: ["default", ["jest-executable-stories/reporter", {
    output: [{ include: "**/*.story.test.ts", mode: "colocated" }],
  }]],
};
// login.story.test.ts → login.story.docs.md (next to test file)
```

### Example: Mixed rules (features colocated, e2e aggregated)

```ts
export default {
  reporters: ["default", ["jest-executable-stories/reporter", {
    output: [
      { include: "src/features/**", mode: "colocated", extension: ".docs.md" },
      { include: "e2e/**", mode: "aggregated", outputFile: "docs/e2e-stories.md" },
      { include: "**/*", mode: "aggregated", outputFile: "docs/other-stories.md" },
    ],
  }]],
};
```

### Example: Single aggregated file

```ts
export default {
  reporters: ["default", ["jest-executable-stories/reporter", { output: "docs/user-stories.md" }]],
};
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

**Explicit behavior:** If you provide `output` rules, only those rules apply. Unmatched files are **ignored**. Add a catch-all rule (e.g., `{ include: "**/*", mode: "aggregated", outputFile: "docs/other.md" }`) if you want a fallback. If you don't provide any `output` rules, the default is **colocated** output next to each test file.

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

Jest-style modifiers are supported on steps:

```ts
import { expect } from "@jest/globals";
import { story, given, when, then } from "jest-executable-stories";

story("User profile", () => {
  given("user is logged in", () => {
    // setup
  });

  when.skip("user uploads avatar"); // Skipped - not implemented yet

  then.todo("avatar appears in header"); // Placeholder - no function needed

  then.fails("invalid upload shows error", () => {
    throw new Error("Expected to fail");
  });

  then.concurrent("notifications update", async () => {
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
| `.only(text, fn)` | Only run this step (Jest focus mode) |
| `.todo(text)` | Placeholder step (no function needed) |
| `.fails(text, fn)` | Step expected to fail |
| `.concurrent(text, fn)` | Run step in parallel |

**Note:** `.todo()` is documented as 📝 and does not execute; it is registered via `test.todo()` when available.

## Scenario modifiers

Skip or focus entire scenarios:

```ts
import { story, given, when, then } from "jest-executable-stories";

story.skip("Future feature", () => {
  // Entire story skipped but documented
  given("some precondition", () => {});
  when("something happens", () => {});
  then("expected result", () => {});
});

story.only("Debug this one", () => {
  // Only this story runs
  given("focused scenario", () => {});
  when("debugging", () => {});
  then("finding the issue", () => {});
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
import { expect } from "@jest/globals";
import { story, given, when, then } from "jest-executable-stories";

story(
  "Admin deletes user",
  { tags: ["admin", "critical"], meta: { priority: "high" } },
  () => {
    given("admin is logged in", () => {});
    when("admin clicks delete", () => {});
    then("user is removed", () => {
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
story.skip("Future admin feature", { tags: ["admin"] }, () => {
  // ...
});
```

## Rich step documentation

Attach rich documentation (notes, key-value pairs, code blocks, tables, links) to individual steps using the `doc` API. Documentation can be **static** (attached at registration time, visible even for skipped steps) or **runtime** (captures execution-time values).

```ts
import { expect } from "@jest/globals";
import { story, given, when, then, doc } from "jest-executable-stories";

story("User logs in", () => {
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
    expect(url).toContain("/dashboard");
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
export default {
  reporters: ["default", ["jest-executable-stories/reporter", {
    title: "User Stories",
    description: "Generated from Jest story tests.",
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
  }]],
};
```

**Notes:**
- `markdown` controls nested indentation (GFM/CommonMark require 4 spaces under list items).
- `includeSourceLinks` uses `permalinkBaseUrl` if set; disable to omit links. Paths are rendered relative to the Jest config root (project root).
- Metadata reads the project's `package.json` version when enabled.
- Git SHA is read from `GITHUB_SHA` or the nearest `.git` folder (shortened).
- JSON output is written alongside Markdown by default (same path, `.json` extension).
- JSON metadata includes `repoRoot` (relative to the current working directory).
- Front-matter includes report metadata and counts for machine parsing.
- Coverage summary can be enabled via `coverage: { include: true }` (reads `coverage/coverage-final.json`).

## Collate JSON reports (CLI)

If you enable `includeJson`, you can collate all JSON reports into a single index:

```bash
jest-executable-stories collate --glob "**/*.json" --out docs/story-index.json
```

You can also collate Markdown files with front-matter:

```bash
jest-executable-stories collate --format md --glob "**/*.md" --out docs/story-index.json
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
import { expect } from "@jest/globals";
import { story, arrange, act, assert } from "jest-executable-stories";

story("Calculator adds numbers", () => {
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

Story metadata is captured at **test registration time** and written to `.jest-executable-stories/` by each test file. This means the reporter can render story structure even when steps are skipped or todo.

**Use modifiers to document without executing:**

- `given.skip("not implemented yet")` - documented, not run
- `then.todo("will add assertion")` - placeholder in docs
- `story.skip("future feature", ...)` - entire story skipped but documented

**Static vs Runtime docs:** Static docs (`doc.*`) are attached at registration time and appear even for skipped steps. Runtime docs (`doc.runtime.*`) only appear for steps that actually run.

**Note:** Docs generation relies on Jest collecting/importing test modules so tests are registered. For truly static docs from AST parsing, a future feature would be needed.

## Reporter options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| **title** | string | `"User Stories"` | Report title (first line: `# ${title}`). |
| **output** | `string \| OutputRule[]` | colocated next to test files | Output configuration. String for single aggregated file, array of rules for mixed modes. See [Output modes](#output-modes). |
| **permalinkBaseUrl** | string | *none* | Base URL for source links. If set, each story gets a `Source: [file](url)` line. In GitHub Actions you can leave this unset and we build the URL from env (see [Permalink](#permalink-to-source)). |
| **enableGithubActionsSummary** | boolean | `true` | When `GITHUB_ACTIONS` is set, append the report to the job summary. See [GitHub Actions](#github-actions-summary). |
| **includeSummaryTable** | boolean | `false` | Add a markdown table: start time, duration, story/step counts, and passed/failed/skipped. |
| **groupBy** | `"file"` \| `"none"` | `"file"` | Group scenarios by source file, or show a flat list. |
| **scenarioHeadingLevel** | `2` \| `3` \| `4` | `3` (file) / `2` (none) | Heading level for story titles. Defaults to `###` when grouping by file, `##` when no grouping. |
| **stepStyle** | `"bullets"` \| `"gherkin"` | `"bullets"` | Render steps as bullet points or Gherkin-style (no bullets). Note: `"gherkin"` is just a rendering option; no Gherkin parsing or feature files. |
| **includeStatus** | boolean | `true` | Include status icons (✅❌⏩📝) on story headings. |
| **includeErrorInMarkdown** | boolean | `true` | Include failure error in markdown for failed scenarios. |
| **customRenderers** | `Record<string, CustomDocRenderer>` | *none* | Custom renderers for `doc.custom()` entries, keyed by type. See [Advanced](#advanced). |

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
- To disable: set `enableGithubActionsSummary: false` in the reporter config.

## API

### story(title, define)

### story(title, options, define)

Defines a story (Jest `describe`). Inside `define`, use the top-level step functions (`given`, `when`, `then`, `and`, and all aliases) which are imported from the package.

**Modifiers:** `story.skip(...)`, `story.only(...)`

### Step functions

`given(text, fn)` / `when(text, fn)` / `then(text, fn)` / `and(text, fn)`

Register a step (Jest `test`) and attach story metadata for the reporter.

**Modifiers:** `.skip(text, fn?)`, `.only(text, fn)`, `.todo(text)`, `.fails(text, fn)`, `.concurrent(text, fn)`

### StoryReporter(options?)

Reporter that reads story metadata emitted during Jest runs and writes Markdown. See [Reporter options](#reporter-options).

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
} from "jest-executable-stories";
```

## How it works

- Helpers wrap Jest's `describe` and `test`; each step is one test so you get normal Jest output and filtering.
- Step functions (`given`, `when`, `then`, etc.) are top-level exports that use AsyncLocalStorage to access the current story context.
- The `define` function runs synchronously, collecting step definitions. After `define()` completes, a single `StoryMeta` snapshot is created and shared by all steps.
- During each test file run, story metadata is written to `.jest-executable-stories/` (one JSON file per test file, per worker).
- The reporter uses **`onRunStart()`** to initialize and clear prior run artifacts, and **`onRunComplete()`** to read the JSON metadata, merge with Jest results, derive pass/fail/skip counts, and write Markdown output.
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

**Custom renderer** in `jest.config.ts`:

```ts
import { CustomDocRenderer } from "jest-executable-stories";

const screenshotRenderer: CustomDocRenderer = (entry, lines, indent) => {
  const { path, alt } = entry.data as { path: string; alt: string };
  lines.push(`${indent}![${alt}](${path})`);
};

const metricRenderer: CustomDocRenderer = (entry, lines, indent) => {
  const { name, value, unit } = entry.data as { name: string; value: number; unit: string };
  lines.push(`${indent}**${name}:** ${value} ${unit}`);
};

export default {
  reporters: [
    "default",
    ["jest-executable-stories/reporter", {
      customRenderers: {
        screenshot: screenshotRenderer,
        metric: metricRenderer,
      },
    }],
  ],
};
```

**Custom rendered output:**

```markdown
- **When** user performs action
  ![Action result](screenshots/action.png)
  **response_time:** 150 ms
```

## Testing

Integration tests run Jest with a fixture config, then assert the generated report.

- **`npm run test`** runs `build` then Jest. It runs the integration test in `src/__tests__/jest/reporter.test.ts`.
- The integration test **spawns** Jest with `--config=src/__tests__/jest/fixtures/jest.config.mjs`. That config runs only the fixture story test and uses the reporter with output to `src/__tests__/jest/fixtures/dist/user-stories.md`.

## License

MIT
