---
title: Common issues
description: Troubleshooting no Markdown, step errors, and framework-specific gotchas
---

## No Markdown generated

**Check:**

1. **Reporter is configured**
   - **Jest:** `reporters` must include the Story reporter with options such as `formats`, `outputDir`, `outputName`, and `output: { mode: 'aggregated' }`. See [Jest reporter options](/reference/jest-config/). Also add `setupFilesAfterEnv: ['executable-stories-jest/setup']`.
   - **Vitest:** `test.reporters` must include the Story reporter. Import from **`executable-stories-vitest/reporter`** (not the main package) so Vitest is not loaded in the config context — otherwise you can see "Vitest failed to access its internal state". See [Vitest reporter options](/reference/vitest-config/).
   - **Playwright:** `reporter` must include the package path with options such as `formats`, `outputDir`, `outputName`, and `output: { mode: 'aggregated' }`. See [Playwright reporter options](/reference/playwright-config/).

2. **At least one story test ran**  
   Make sure a file that calls `story.init()` (or `story.init(task)` / `story.init(testInfo)`) inside a test is included in your test run and not excluded by config or filters.

3. **Output path is writable**  
   For aggregated mode, the directory for the output file must exist (or the reporter may create it, depending on the package). For colocated mode, the reporter writes next to the test file.

## "story.init(...) must be called first"

Step markers (`story.given`, `story.when`, `story.then`, etc.) must be called **only after** `story.init()` (or `story.init(task)` / `story.init(testInfo)`) in the **same test**. If you call them outside a test or before `story.init()`, you'll get an error.

**Wrong:**

```ts
story.given('user is on login page'); // ❌ no story.init() yet
it('user logs in', () => {
  story.init(task);
  story.when('user submits');
  story.then('user sees dashboard');
});
```

**Correct:**

```ts
it('user logs in', ({ task }) => {
  story.init(task); // ✅ call first
  story.given('user is on login page');
  story.when('user submits');
  story.then('user sees dashboard');
});
```

**Jest:** Use `story.init()` with no arguments. **Playwright:** Use `story.init(testInfo)` and pass `testInfo` from the test callback.

## Vitest: "Vitest failed to access its internal state"

The main entry re-exports BDD helpers that import Vitest; importing it in config can break. Do not import the reporter from the main entry. In config, reference the reporter via the **`/reporter`** entrypoint.

**Fix:** In `vitest.config.ts`, import the reporter from the **reporter** subpath only:

```ts
import { StoryReporter } from 'executable-stories-vitest/reporter';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: ['default', new StoryReporter()],
  },
});
```

Do **not** use `import { ... } from "executable-stories-vitest"` in the config file.

## Jest / Vitest: Suite path (## Suite name) in docs

- **Jest:** A `## Suite name` heading in colocated/aggregated docs appears only when Jest's `currentTestName` contains `" > "` (e.g. "Describe title > test name"). With the default Jest setup this is often **not** the case, so docs are flat unless you configure test name formatting.
- **Vitest:** Suite path in docs comes from `task.suite` when tests run inside a `describe()` block.

## Playwright: Modifier names

Playwright uses **`.fail`** (expected failure), not `.fails`. We follow Playwright's naming: `.skip`, `.only`, `.fixme`, `.todo`, `.fail`, `.slow` on steps, and `story.skip`, `story.only`, `story.fixme`, `story.slow` on scenarios. Jest and Vitest use `.fails` instead.

## Docs without running step bodies

Story structure is captured as the test runs (when you call `story.init` and the step markers). The reporter can still render scenarios when the test is skipped or todo if the framework exposes that.

- Use the framework’s modifiers on the **test**: `it.skip("...", () => { ... })`, `it.todo("...", () => { ... })`, etc., so the scenario still appears in the report with the right status.
- **Doc methods** (`story.note`, `story.kv`, etc.) are attached to the current step or story and appear in the report when that test runs. If the test is skipped, the scenario may show with no steps or minimal content depending on reporter behavior.

If you see a scenario in the report with no steps or missing doc content, check that the test ran and that `story.init()` and step markers are executed.
