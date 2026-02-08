---
title: Why not Cucumber?
description: We write TypeScript, not Gherkin — no feature files, no step matching, no world object
---

Executable Stories gives you **given/when/then** wording and readable docs, but it is **not** Cucumber. We stay inside your test runner and your codebase.

## No feature files

You write **TypeScript** (or JavaScript), not Gherkin. Stories and steps live in `.test.ts` / `.spec.ts` files next to your code. There are no `.feature` files to keep in sync.

## No step matching

Steps are **inline functions**, not regex-matched definitions. You don’t define “When I click the button” in one file and use it from another. You write the step and its implementation in the same place, so refactors and renames stay in sync and types work.

## No "world" object

There is no shared “world” or context object. Use normal **variables and closures** (and framework fixtures in Playwright). Same mental model as any other test in Jest, Vitest, or Playwright.

## Still Confluence-ready

The reporter outputs **plain Markdown** with natural-language sections. You can paste it into Confluence, Notion, or any Markdown renderer. Stakeholders see “Given … When … Then …” without needing to understand the test runner.

## This is your framework, not Cucumber

We **add** story metadata to your existing tests; we don’t replace `describe` / `it` or `test`.

- **Your tests** — You keep `describe()` and `it()` (or `test.describe()` and `test()`). We don’t take over the test lifecycle.
- **Opt-in docs** — Call `story.init(task)` (or `story.init()` / `story.init(testInfo)` for Jest/Playwright) at the start of a test, then `story.given`, `story.when`, `story.then` to attach step labels. The scenario title in the report is the **it/test name**.
- **Modifiers** — Use the framework’s own: `it.skip`, `it.only`, `test.fail`, etc. No custom step registry.
- **No enforced step order** — Steps are just labels inside one test; filter and run tests with the framework’s normal options (`-t`, `--watch`, etc.).

If you want BDD-style wording and shareable docs without a separate Gherkin runtime, executable-stories is built for that.
