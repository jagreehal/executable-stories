# Agent guidance: executable-stories

Context for AI agents working in this repo.

## Vision

Framework native first.

This project is not Cucumber. We do not implement Gherkin, step matching, or a world object. We build small APIs that feel normal inside the host framework.

Rule of thumb:
If a change makes it feel less like Vitest, Jest, or Playwright, do not do it.

Examples:
- Prefer using the framework test primitives and reporting hooks.
- Do not add a separate runtime, interpreter, or feature file layer.
- Do not invent global shared state to simulate a world.

Goal:
Tests are the source of truth. Docs are derived from test registration and results.

## Project layout

- **Packages** (publishable): `packages/` — `jest-executable-stories`, `vitest-executable-stories`, `playwright-executable-stories`, `eslint-config`, `eslint-plugin-jest-executable-stories`, `eslint-plugin-vitest-executable-stories`, `eslint-plugin-playwright-executable-stories`.
- **Example apps** (consumers): `apps/` — `jest-example`, `vitest-example`, `playwright-example`; used to validate the packages.

Monorepo: pnpm workspaces, Turbo for build/lint/test/type-check.

## ESLint plugins

One ESLint plugin per framework (Jest, Vitest, Playwright). Each lives in `packages/eslint-plugin-<framework>-executable-stories/`.

- **Structure:** `src/rules/*.ts`, `src/index.ts` (plugin export with rules + configs), `tests/<rule-name>.test.ts` per rule.
- **Testing:** Lint rules **must** be tested. Use the same pattern as [awaitly eslint-plugin](https://github.com/jagreehal/awaitly/tree/main/packages/eslint-plugin-awaitly): Vitest + `new Linter({ configType: "flat" })`, flat config with plugin and rule enabled, `linter.verify(code, config)`, assert valid (0 messages) and invalid (1+ messages, correct ruleId/message).
- **Configs:** Each plugin exports a `recommended` config. Vitest plugin enables `require-task-for-doc-story`; Jest/Playwright plugins have no rules in v1 but export config for future rules.
- **No peer deps on official framework ESLint plugins** (e.g. eslint-plugin-playwright): our rules do not depend on their code. Document using our plugin alongside official ones if desired; do not require or bundle them.

## Verification

Run full quality gate before claiming work complete:

```bash
pnpm quality
```

This runs (in order): `turbo run build`, `turbo run lint`, `turbo run type-check`, `turbo run test`.

## Vitest: do not export top-level `then`

Do **not** export or import a top-level symbol named `then` from the Vitest package (e.g. `import { then } from "vitest-executable-stories"`).

**Reason:** Tooling that uses `await import("...")` can treat the module namespace as a value. If that object has a `then` property, it may be treated as a thenable and `then` can be invoked unexpectedly, causing import-time side effects or broken imports.

**Decision:** The Vitest package must not expose a top-level `then`. Use the callback API:

```ts
story("Title", (steps) => {
  steps.given("...", () => {});
  steps.when("...", () => {});
  steps.then("...", () => {});
});
```

## Compatibility rule

Keep the same story structure and doc model across packages.
Framework specific behavior is allowed only when the host framework requires it.

**Feature matrix (README.md):** When adding a step/scenario modifier, doc kind, or scenario option to one package, update the Features matrix in `README.md` and note any intentional divergence (e.g. Vitest callback-only API, Playwright `.fail` vs Jest/Vitest `.fails`).

## Keyword resolution rules

**Auto-And conversion** applies to `Given`, `When`, `Then` when they repeat **anywhere in the same story**:

- First `given()` → renders "Given"
- Any subsequent `given()` in same story → renders "And"
- Same rule for `when()` and `then()`

**Explicit keywords** never auto-convert:

- `and()` → always renders "And"
- `but()` → always renders "But"

This matches Gherkin semantics where "But" expresses negative intent/contrast.

Example:

```ts
story("Login blocked for suspended user", () => {
  given("the user account exists");
  given("the account is suspended");  // → "And" (auto-converted)
  when("the user submits valid credentials");
  then("the user should see an error message");
  but("the user should not be logged in");   // → "But" (explicit, never And)
  but("the session should not be created");  // → "But" (still explicit)
});
```

## Vitest API

Vitest exports: `story`, `doc`, types, reporter via subpath.
Step functions exist **only** on the callback `steps` object:

```ts
story("...", (s) => {
  s.given("...");
  s.when("...");
  s.then("...");
  s.but("...");
});
```

Do not add top-level step exports to Vitest (see `then` issue above).

## Jest API

Jest exports top-level step functions: `given`, `when`, `then`, `and`, `but`.
Do not change this - it's intentional for Jest.

## Playwright API

Playwright exports top-level step functions: `given`, `when`, `then`, `and`, `but`.
Steps receive Playwright fixtures: `async ({ page }) => { ... }`.

## Framework-native tests

You can attach story metadata to a plain `it()` / `test()` without using `story()`:

- **With task** (Vitest/Playwright): `it("...", ({ task }) => { doc.story("Title", task); ... });`
- **With callback** (same as story): `doc.story("Title", (s) => { s.given(...); s.when(...); s.then(...); });`

Use this when you want a framework-native test (e.g. `it("adds two numbers", () => { expect(add(1,2)).toBe(3); })`) to still appear in the generated docs.

### Doc heading and describe in generated docs

- **Scenario heading (the line with ✅):** Always comes from the **story title** — the first argument to `doc.story("...", task)` or `story("...", ...)`. The **it/test name is never used** for this heading. So `it("simple addition check", ({ task }) => { doc.story("Basic addition sanity check", task); ... })` produces `### ✅ Basic addition sanity check`, not "simple addition check".
- **Describe → ## grouping:** A `## Suite name` heading in colocated docs appears only when the framework supplies a suite path:
  - **Vitest:** Always when the test runs under a `describe()` — suite path is taken from `task.suite`.
  - **Jest:** Only if `expect.getState().currentTestName` contains `" > "`. In the default Jest setup this is **space-separated** (e.g. `"Describe title test name"`), so suite path is usually undefined and docs are flat. Verified in `apps/jest-example` (see test "verify currentTestName format for docs" in framework-native.story.test.ts).
  - **Playwright:** Suite path comes from `test.info().titlePath`; after filtering file-like parts, describe titles are kept so colocated docs get `## Suite name` when tests run inside `test.describe()`.
