---
title: Developer experience
description: How executable-stories fits into each framework — entry point, mental model, modifiers, and framework-native tests
---

We aim for a **seamless native experience** in each framework. Same lifecycle, same reporting; no extra runner or "world" object.

## Jest

- **Entry point:** Import `story`, `given`, `when`, `then` from `jest-executable-stories` and `expect` from `@jest/globals`. Nothing else is required.
- **Mental model:** You are writing `describe()` + `test()` with readable step labels. Each step is one Jest test; they appear in Jest's reporter and respect `-t`, `--watch`, and other Jest options.
- **Modifiers:** `.skip`, `.only`, `.todo`, `.fails`, `.concurrent` behave like Jest's `test.skip` / `test.only` / etc. No custom semantics.
- **Framework-native tests:** Use plain `test("...", () => { doc.story("Title"); ... })` to attach a story title to a regular Jest test so it appears in the generated docs. Suite path in docs (e.g. `## Suite name`) only appears when Jest's `currentTestName` contains `" > "`; with the default Jest setup this is often not the case, so docs are flat unless you configure test name formatting.
- **Reporter:** Add `["jest-executable-stories/reporter", { output: "docs/user-stories.md" }]` to `reporters` in your Jest config. Markdown is written as a side effect of the same test run.

**What we guarantee:** Native describe/test, standard modifiers, and `doc.story()` for plain tests. The only intentional difference is how we group scenarios in the generated Markdown (by story title and file).

**Note on `.concurrent`:** Steps with `.concurrent` may run in parallel. Since step keywords don't enforce execution order, this is Jest-like behavior, but be aware that parallelism can affect scenarios where steps depend on shared state.

## Vitest

- **Entry point:** Import `story` from `vitest-executable-stories` and use the **callback** pattern: `story("...", (steps) => { steps.given(...); steps.when(...); steps.then(...); })`. This is the primary and recommended pattern. Step functions exist only on the callback `steps` object; there is no top-level `then` export (see "Why no top-level then?" below).
- **Mental model:** You are writing a describe and multiple `it()`s with step labels. Each step is one Vitest test; they appear in Vitest's reporter and respect `-t`, `--watch`, and other Vitest options.
- **Modifiers:** `.skip`, `.only`, `.todo`, `.fails`, `.concurrent` work the same as Vitest's step modifiers. Use them on the callback object: `steps.then.skip(...)`, `steps.given.todo(...)`, etc.
- **Framework-native tests:** To attach a story to a plain Vitest test, use `it("...", ({ task }) => { doc.story("Title", task); ... })`. The **`task`** argument is **required** so we can attach the story to this test. Without `task`, the story will not appear in the generated docs. After `doc.story("Title", task)`, other `doc.*` methods in the same test may not be fully reflected in the report; use `story()` with a callback when you need the full doc API.
- **Alternatives for `then`:** If you want a `then`-like name without importing from the package, use the callback parameter: `(steps) => { const { then } = steps; then("...", () => {}); }` or use the module-level `step` object: `import { step } from "vitest-executable-stories"; step.then("...", () => {});` (only inside a `story()` callback).
- **Reporter:** Import from **`vitest-executable-stories/reporter`** (not the main package) so the config does not load the main package, which can cause "Vitest failed to access its internal state" when loaded inside the config file.

**Why no top-level `then`?** Tooling that uses `await import("...")` can treat the module namespace as a thenable if it has a `then` property, causing import-time side effects or broken imports. We therefore do not export a top-level `then`; the callback API is the intended, natural way to use steps in Vitest.

**What we guarantee:** Native describe/it, standard modifiers via the callback, and `doc.story("Title", task)` for plain tests (with `task` required). The only intentional difference from Jest/Playwright is the callback-only step API and the `task` argument for framework-native story attachment.

**Note on `.concurrent`:** Steps with `.concurrent` may run in parallel. Be aware that parallelism can affect scenarios where steps depend on shared state.

### Wallaby and Vitest 4

Wallaby's automatic config extraction can fail when custom reporter instances are in the config. Use a separate config file for Wallaby without the reporter:

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

## Playwright

- **Entry point:** Import `story`, `given`, `when`, `then` from `playwright-executable-stories` and `test`, `expect` from `@playwright/test`. Step callbacks are **async** and receive Playwright fixtures: `given("...", async ({ page }) => { await page.goto("/login"); })`.
- **Mental model:** You are writing `test.describe()` + `test()` with given/when/then labels. Each step is one Playwright test; fixtures (e.g. `page`, `context`, `browser`) work exactly as in any Playwright test.
- **Modifiers:** Playwright uses **`.fail`** (expected failure), not `.fails`. We expose `.skip`, `.only`, `.fixme`, `.todo`, `.fail`, `.slow` on steps and `story.skip`, `story.only`, `story.fixme`, `story.slow` on scenarios. This matches Playwright's naming; Jest and Vitest use `.fails` instead.
- **Framework-native tests:** Use plain `test("...", async () => { doc.story("Title"); ... })` to attach a story title to a regular Playwright test. No `task` argument is required (unlike Vitest). Suite path in docs comes from `test.describe()` nesting via Playwright's title path.
- **Hooks:** `test.beforeEach` and `test.afterEach` work as usual. Because each step is a separate test, **beforeEach runs before every step** (and afterEach after every step). Manage shared state within the story (e.g. variables in the closure) or via Playwright fixtures.
- **Reporter:** Use the package path: `["playwright-executable-stories/reporter", { output: "docs/user-stories.md" }]` so Playwright loads the reporter correctly.

**What we guarantee:** Native test.describe/test, Playwright modifiers (including `.fail` and `.fixme`), fixtures in steps, and `doc.story("Title")` for plain tests. The only intentional difference from Jest/Vitest is the modifier names (`.fail` vs `.fails`) and the presence of `.fixme` and `.slow`, which match Playwright's API.
