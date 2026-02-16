---
'executable-stories-playwright': minor
'executable-stories-cypress': minor
'executable-stories-vitest': minor
'executable-stories-jest': minor
'eslint-config-executable-stories': minor
---

**Step callbacks and Auto-And (Jest, Vitest, Playwright, Cypress)**

- **Step callbacks**: `story.given("text", () => value)` / `story.when("text", async () => value)` — optional callback runs after the step is recorded; return value is passed through; step gets `wrapped: true` and `durationMs`. Marker-only and inline-docs usage unchanged.
- **Auto-And**: Repeated Given/When/Then in the same story render as "And" (first occurrence keeps Given/When/Then). Explicit `and()` / `but()` unchanged.
- **Jest & Playwright**: Top-level exports `given`, `when`, `then`, `and`, `but` (framework contract).
- **Playwright**: `story.init(fixtures, testInfo)` or `story.init(testInfo, { fixtures })` so step callbacks receive the test’s fixtures as first argument.

**ESLint**

- `no-restricted-syntax` (no dynamic `import()`) moved into `eslint-config-executable-stories` with an exception for `reporter.ts` and `__tests__/error-handling.test.ts`. Root config adds exceptions for `__tests__/story-api.test.ts` (and error-handling test) where needed.
