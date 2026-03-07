---
name: eslint-playwright-rules
description: >
  ESLint flat config plugin for executable-stories-playwright. Two rules:
  require-story-context-for-steps (steps must be inside story callback),
  require-test-context-for-doc-story (doc.story must be inside test()).
  Recommended config enables both at error level. Detects Playwright
  modifiers: only, skip, fixme, fail, slow.
type: core
library: eslint-plugin-executable-stories-playwright
library_version: "0.1.0"
sources:
  - "jagreehal/executable-stories:packages/eslint-plugin-executable-stories-playwright/src/index.ts"
---

# ESLint Plugin: executable-stories-playwright

## Setup

```typescript
// eslint.config.mjs
import playwrightStories from "eslint-plugin-executable-stories-playwright";

export default [
  // Option A: Use recommended config
  ...playwrightStories.configs.recommended,

  // Option B: Manual configuration
  {
    plugins: {
      "executable-stories-playwright": playwrightStories,
    },
    rules: {
      "executable-stories-playwright/require-story-context-for-steps": "error",
      "executable-stories-playwright/require-test-context-for-doc-story": "error",
    },
  },
];
```

## Core Patterns

### Rule: require-story-context-for-steps

Ensures step functions (`given`, `when`, `then`, `and`, `but` and aliases) are called inside a `story()` or `doc.story(..., callback)`.

```typescript
// Fails lint
test("my test", async ({ page }, testInfo) => {
  given("something"); // Error: must be inside story() or doc.story()
});

// Passes lint
test("my test", async ({ page }, testInfo) => {
  story.init(testInfo);
  story.given("something");
});
```

### Rule: require-test-context-for-doc-story

Ensures `doc.story(title)` is called inside a `test()` callback.

```typescript
// Fails lint
function setup() {
  doc.story("My story"); // Error: must be inside test() callback
}

// Passes lint
test("my test", async ({ page }, testInfo) => {
  doc.story("My story");
});

// Detects Playwright modifiers: test.only, test.skip, test.fixme, test.fail, test.slow
test.skip("skipped test", async ({ page }, testInfo) => {
  doc.story("My story"); // Passes lint
});
```

## Common Mistakes

### HIGH Using legacy .eslintrc instead of flat config

Wrong:

```json
{
  "plugins": ["executable-stories-playwright"],
  "rules": {
    "executable-stories-playwright/require-story-context-for-steps": "error"
  }
}
```

Correct:

```typescript
// eslint.config.mjs (flat config)
import playwrightStories from "eslint-plugin-executable-stories-playwright";

export default [...playwrightStories.configs.recommended];
```

This plugin only supports ESLint 9 flat config.

Source: packages/eslint-plugin-executable-stories-playwright/src/index.ts
