# Agent guidance: executable-stories

TypeScript-first BDD story testing monorepo. Tests and documentation from the same code. Context for AI agents working in this repo.

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

## Project structure

```
packages/
  executable-stories-vitest/     # Vitest adapter (story API + StoryReporter)
  executable-stories-jest/       # Jest adapter
  executable-stories-playwright/ # Playwright adapter
  executable-stories-cypress/    # Cypress adapter
  executable-stories-formatters/ # Core: report generation (HTML, Markdown, JUnit, Cucumber JSON/HTML/Messages)
  eslint-config/                 # Shared ESLint config
  eslint-plugin-*-executable-stories/ # Per-framework ESLint plugins

apps/
  vitest-example/    # Vitest example app
  jest-example/      # Jest example app
  playwright-example/ # Playwright example app
  cypress-example/   # Cypress example app
  docs-site/         # Astro Starlight documentation site
```

- **Packages** (publishable): `executable-stories-formatters` is the CLI; can be built as a Bun single binary via `bun run compile`; CI/release artifacts include prebuilt binaries for linux, darwin, windows.
- **Example apps** (consumers): used to validate the packages. Monorepo: pnpm workspaces, Turbo for build/lint/test/type-check.

## Tech stack

- **Runtime**: Node >= 22, pnpm 10, TypeScript ~5.9
- **Monorepo**: pnpm workspaces + Turborepo
- **Build**: tsup (all packages)
- **Test**: Vitest (packages + vitest-example), Jest (jest-example), Playwright (playwright-example), Cypress (cypress-example)
- **Lint**: ESLint 9 flat config, Prettier
- **Docs**: Astro Starlight with Tailwind CSS

## Key commands

Run full quality gate before claiming work complete:

```bash
pnpm quality          # Full pipeline: build -> lint -> type-check -> test (excludes cypress)
pnpm build            # turbo run build
pnpm lint             # turbo run lint
pnpm type-check       # turbo run type-check (tsc --noEmit in all packages/apps)
pnpm test             # turbo run test
```

This runs (in order): `turbo run build`, `turbo run lint`, `turbo run type-check`, `turbo run test`.

## Architecture

### Formatter pipeline (packages/executable-stories-formatters)

```
Test code (story.given/when/then/json/mermaid/...)
  -> Framework adapter (vitest/jest/playwright/cypress)
    -> RawRun JSON
      -> ACL canonicalization -> TestRunResult
        -> Formatters (HTML, Markdown, JUnit, Cucumber JSON/HTML/Messages)
```

- **fn(args, deps)** pattern throughout: functions take `(args, deps)` for explicit dependency injection
- No classes except thin wrappers for backward compat (e.g., `HtmlFormatter`, `ReportGenerator`)
- HTML renderer uses layered composition: `buildBody -> renderFeature -> renderScenario -> renderSteps -> renderDocEntry`

### HTML report CDN features (all enabled by default)

- `syntaxHighlighting`: highlight.js for code blocks
- `mermaidEnabled`: Mermaid.js for live diagram rendering
- `markdownEnabled`: marked.js for markdown section parsing

Use `--html-no-mermaid`, `--html-no-syntax-highlighting`, `--html-no-markdown` CLI flags to disable.

### Story API

All framework adapters expose the same API surface:

- **Steps**: `story.given()`, `story.when()`, `story.then()`, `story.and()`, `story.but()`
- **Aliases**: `story.arrange()`, `story.act()`, `story.assert()`, etc.
- **Docs** (object params): `story.json({ label, value })`, `story.kv({ label, value })`, `story.code({ label, content, lang? })`, `story.table({ label, columns, rows })`, `story.link({ label, url })`, `story.section({ title, markdown })`, `story.mermaid({ code, title? })`, `story.custom({ type, data })`, `story.screenshot({ path, alt? })`
- **Simple docs**: `story.note(text)`, `story.tag(names)`

## Conventions

- Package scripts use **kebab-case**: `type-check`, not `typecheck`
- Story test files use `.story.test.ts` (vitest/jest) or `.story.spec.ts` (playwright) or `.story.cy.ts` (cypress)
- ESM throughout (`"type": "module"` in all package.json)
- Packages export via tsup with both ESM and CJS builds
- `@types/node` should be `^25.2.1` across all workspace packages

## ESLint plugins

One ESLint plugin per framework (Jest, Vitest, Playwright). Each lives in `packages/eslint-plugin-<framework>-executable-stories/`.

- **Structure:** `src/rules/*.ts`, `src/index.ts` (plugin export with rules + configs), `tests/<rule-name>.test.ts` per rule.
- **Testing:** Lint rules **must** be tested. Use the same pattern as [awaitly eslint-plugin](https://github.com/jagreehal/awaitly/tree/main/packages/eslint-plugin-awaitly): Vitest + `new Linter({ configType: "flat" })`, flat config with plugin and rule enabled, `linter.verify(code, config)`, assert valid (0 messages) and invalid (1+ messages, correct ruleId/message).
- **Configs:** Each plugin exports a `recommended` config. Vitest plugin enables `require-task-for-doc-story`; Jest/Playwright plugins have no rules but export config for future use.
- **No peer deps on official framework ESLint plugins** (e.g. eslint-plugin-playwright): our rules do not depend on their code. Document using our plugin alongside official ones if desired; do not require or bundle them.

## Vitest: do not export top-level `then`

Do **not** export or import a top-level symbol named `then` from the Vitest package (e.g. `import { then } from "executable-stories-vitest"`).

**Reason:** Tooling that uses `await import("...")` can treat the module namespace as a value. If that object has a `then` property, it may be treated as a thenable and `then` can be invoked unexpectedly, causing import-time side effects or broken imports.

**Decision:** The Vitest package must not expose a top-level `then`. Use the callback API:

```ts
story('Title', (steps) => {
  steps.given('...', () => {});
  steps.when('...', () => {});
  steps.then('...', () => {});
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
story('Login blocked for suspended user', () => {
  given('the user account exists');
  given('the account is suspended'); // → "And" (auto-converted)
  when('the user submits valid credentials');
  then('the user should see an error message');
  but('the user should not be logged in'); // → "But" (explicit, never And)
  but('the session should not be created'); // → "But" (still explicit)
});
```

## Vitest API

Vitest exports: `story`, `doc`, types, reporter via subpath.
Step functions exist **only** on the callback `steps` object:

```ts
story('...', (s) => {
  s.given('...');
  s.when('...');
  s.then('...');
  s.but('...');
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

## Testing

- `packages/executable-stories-formatters/` has the most tests (260+) covering all formatters
- App tests are integration/example tests demonstrating the story API
- Cypress tests are excluded from `pnpm quality` (run separately)
- Tests in `packages/` use Vitest; `apps/jest-example` uses Jest
