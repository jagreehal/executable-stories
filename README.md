# executable-stories

Executable stories without Cucumber in your framework of choice with automatic Markdown documentation.

## Why not Cucumber?

| This project | Cucumber |
| ------------ | -------- |
| Write TypeScript | Write Gherkin feature files |
| Steps are inline functions | Steps matched by regex |
| Normal variables and closures | World object and shared state |
| Docs generated from test runs | Separate documentation pipeline |

One source of truth. Code that executes. Docs that do not lie.

## What you get

- Scenario API built on your test runner's native primitives
- `given()`, `when()`, `then()`, `and()`, `but()` helpers that register real tests
- Reporter that generates Markdown from test metadata
- Output readable by developers and stakeholders

If a test is skipped, failed, or todo, the docs reflect that.

## Packages

| Package | Test Runner | Install |
| ------- | ----------- | ------- |
| [jest-executable-stories](./packages/jest-executable-stories) | Jest 30+ | `npm i -D jest-executable-stories` |
| [vitest-executable-stories](./packages/vitest-executable-stories) | Vitest 4+ | `npm i -D vitest-executable-stories` |
| [playwright-executable-stories](./packages/playwright-executable-stories) | Playwright 1.58+ | `npm i -D playwright-executable-stories` |

Example apps: [apps/jest-example](./apps/jest-example), [apps/vitest-example](./apps/vitest-example), [apps/playwright-example](./apps/playwright-example).

### Features matrix

| Feature | Jest | Vitest | Playwright |
| ------- | ---- | ------ | ---------- |
| **API** | Top-level `given` / `when` / `then` | Callback `steps.given` / `steps.when` / `steps.then` | Top-level `given` / `when` / `then` |
| **Step modifiers** | `.skip` `.only` `.todo` `.fails` `.concurrent` | `.skip` `.only` `.todo` `.fails` `.concurrent` | `.skip` `.only` `.fixme` `.todo` `.fail` `.slow` |
| **Scenario modifiers** | `story.skip` `story.only` | `story.skip` `story.only` | `story.skip` `story.only` `story.fixme` `story.slow` |
| **Output modes** | Colocated, aggregated, mixed | Colocated, aggregated, mixed | Colocated, aggregated, mixed |
| **Rich step docs** (`doc` API) | ✅ note, kv, code, table, link, section, mermaid, screenshot, runtime, custom | ✅ same | ✅ same |
| **Scenario options** | `tags`, `meta`, `ticket` | `tags`, `meta`, `ticket` | `tags`, `meta`, `ticket` |
| **Attach story to plain it/test** | `doc.story("Title")` inside `test()` | `doc.story("Title", task)` with `it(..., ({ task }) => ...)` | `doc.story("Title")` inside `test()` |
| **AAA aliases** | arrange/act/assert, setup/context, etc. | arrange/act/assert, setup/context, etc. | arrange/act/assert, setup/context, etc. |
| **CLI collate** | ✅ | ✅ | ✅ |
| **GitHub Actions summary** | ✅ | ✅ | ✅ |
| **Custom doc renderers** | ✅ | ✅ | ✅ |

For per-framework behaviour and guarantees (entry point, mental model, modifiers, framework-native attach), see: [Jest — Developer experience](./packages/jest-executable-stories/README.md#developer-experience), [Vitest — Developer experience](./packages/vitest-executable-stories/README.md#developer-experience), [Playwright — Developer experience](./packages/playwright-executable-stories/README.md#developer-experience).

Details and reporter options: see each package’s README.

## Quick example

**Jest or Playwright** (top-level steps):

```ts
import { story, given, when, then } from "jest-executable-stories"; // or playwright-executable-stories
import { expect } from "@jest/globals"; // or from "vitest" / "@playwright/test"

story("User logs in", () => {
  given("user is on login page");
  when("user submits valid credentials");
  then("user sees the dashboard", () => {
    expect(true).toBe(true); // or real assertion
  });
});
```

**Vitest** (steps on callback only; no top-level `then`):

```ts
import { story } from "vitest-executable-stories";
import { expect } from "vitest";

story("User logs in", (steps) => {
  steps.given("user is on login page");
  steps.when("user submits valid credentials");
  steps.then("user sees the dashboard", () => {
    expect(true).toBe(true);
  });
});
```

Playwright step callbacks can use fixtures: `given("...", async ({ page }) => { await page.goto("/login"); });`

**Generated Markdown:**

```markdown
### User logs in

- **Given** user is on login page
- **When** user submits valid credentials
- **Then** user sees the dashboard
```

## Getting started

1. Install the package for your test runner
2. Add the reporter to your config
3. Run your tests
4. Open the generated Markdown

See each package's README for detailed setup instructions.

## Development

From the repo root: `pnpm quality` runs build, lint, type-check, and test for all packages. Example apps in `apps/` use the workspace packages.

## License

MIT
