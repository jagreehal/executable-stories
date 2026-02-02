---
title: Common issues
description: Troubleshooting no Markdown, step errors, and framework-specific gotchas
---

## No Markdown generated

**Check:**

1. **Reporter is configured**  
   - **Jest:** `reporters` in `jest.config.ts` must include `["jest-executable-stories/reporter", { output: "..." }]` (or your chosen output).
   - **Vitest:** `test.reporters` must include the Story reporter. Import from **`vitest-executable-stories/reporter`** (not the main package) so Vitest is not loaded in the config context — otherwise you can see "Vitest failed to access its internal state".
   - **Playwright:** `reporter` in `playwright.config.ts` must include the package path: `["playwright-executable-stories/reporter", { output: "..." }]`.

2. **At least one story test ran**  
   Make sure a file that uses `story()` (e.g. `*.story.test.ts` or `*.story.spec.ts`) is included in your test run and not excluded by config or filters.

3. **Output path is writable**  
   For aggregated mode, the directory for the output file must exist (or the reporter may create it, depending on the package). For colocated mode, the reporter writes next to the test file.

## "Step functions must be called inside a story()"

Step functions (`given`, `when`, `then`, `and`) must be called **only inside the callback** of `story('...', () => { ... })`.

**Wrong:**

```ts
given("user is on login page", () => {}); // ❌ outside story()
story("User logs in", () => {
  when("user submits", () => {});
  then("user sees dashboard", () => {});
});
```

**Correct:**

```ts
story("User logs in", () => {
  given("user is on login page", () => {});  // ✅ inside story callback
  when("user submits", () => {});
  then("user sees dashboard", () => {});
});
```

**Vitest:** Use the callback parameter: `story("...", (steps) => { steps.given(...); steps.when(...); steps.then(...); })`. Do not call step functions outside that callback.

## Vitest: Story not in docs for a plain `it()`

To attach a story to a **plain Vitest test** (so it appears in the generated docs), you must use `doc.story("Title", task)` with the **`task`** argument from the test callback.

**Wrong:**

```ts
it("user logs in", () => {
  doc.story("User logs in"); // ❌ missing task — story won't appear in docs
  // ...
});
```

**Correct:**

```ts
it("user logs in", ({ task }) => {
  doc.story("User logs in", task); // ✅ task is required
  // ...
});
```

Without `task`, the story metadata is not attached to that test and the scenario will not appear in the report.

## Vitest: "Vitest failed to access its internal state"

The main entry re-exports BDD helpers that import Vitest; importing it in config can break. Do not import the reporter from the main entry. In config, reference the reporter via the **`/reporter`** entrypoint.

**Fix:** In `vitest.config.ts`, import the reporter from the **reporter** subpath only:

```ts
import { defineConfig } from "vitest/config";
import { StoryReporter } from "vitest-executable-stories/reporter";

export default defineConfig({
  test: {
    reporters: ["default", new StoryReporter()],
  },
});
```

Do **not** use `import { ... } from "vitest-executable-stories"` in the config file.

## Jest / Vitest: Suite path (## Suite name) in docs

- **Jest:** A `## Suite name` heading in colocated/aggregated docs appears only when Jest's `currentTestName` contains `" > "` (e.g. "Describe title > test name"). With the default Jest setup this is often **not** the case, so docs are flat unless you configure test name formatting.
- **Vitest:** Suite path in docs comes from `task.suite` when tests run inside a `describe()` block.

## Playwright: Modifier names

Playwright uses **`.fail`** (expected failure), not `.fails`. We follow Playwright's naming: `.skip`, `.only`, `.fixme`, `.todo`, `.fail`, `.slow` on steps, and `story.skip`, `story.only`, `story.fixme`, `story.slow` on scenarios. Jest and Vitest use `.fails` instead.

## Docs without running step bodies

Story structure is captured at **test registration time**, so the reporter can render scenarios even when steps are skipped or todo.

- Use `given.skip("...")`, `then.todo("...")`, or `story.skip("...")` to document without executing.
- **Static** docs (`doc.note`, `doc.kv`, etc.) are attached at registration and appear even for skipped steps.
- **Runtime** docs (`doc.runtime.note`, `doc.runtime.kv`, etc.) only appear for steps that actually run.

If you see a scenario in the report with no steps or missing runtime doc content, check that the step was not skipped.
