---
name: eslint-playwright-rules
description: >
  Use when setting up ESLint rules for executable-stories-playwright:
  enforcing story.init() ordering before steps, story-context scoping for
  step calls, doc.story test-context requirements, or detecting Playwright
  test modifiers (only/skip/fixme/fail/slow).
metadata:
  type: core
  library: eslint-plugin-executable-stories-playwright
  library_version: '2.1.11'
  sources:
    - 'jagreehal/executable-stories:packages/eslint-plugin-executable-stories-playwright/src/index.ts'
---

# ESLint Plugin: executable-stories-playwright

## Setup

```typescript
// eslint.config.mjs
import playwrightStories from 'eslint-plugin-executable-stories-playwright';

export default [
  // Option A: Use recommended config (enables all rules at error)
  ...playwrightStories.configs.recommended,

  // Option B: Manual configuration
  {
    plugins: {
      'executable-stories-playwright': playwrightStories,
    },
    rules: {
      'executable-stories-playwright/require-init-before-steps': 'error',
      'executable-stories-playwright/require-story-context-for-steps': 'error',
      'executable-stories-playwright/require-test-context-for-doc-story':
        'error',
    },
  },
];
```

## Core Patterns

### Rule: require-init-before-steps

Ensures `story.init(testInfo)` is called before any step markers.

```typescript
// Fails lint
test('my test', async ({ page }, testInfo) => {
  story.given('something', async () => {}); // Error: story.init(testInfo) must be called first
  story.init(testInfo);
});

// Passes lint
test('my test', async ({ page }, testInfo) => {
  story.init(testInfo);
  story.given('something', async () => {});
});
```

Detects all step methods: `given`, `when`, `then`, `and`, `but`, `arrange`, `act`, `assert`, `setup`, `context`, `execute`, `action`, `verify`, `fn`, `expect`.

### Rule: require-story-context-for-steps

Ensures bare step functions (`given`, `when`, `then`, `and`, `but` and aliases) are called inside a `story()` callback, `doc.story(..., callback)`, or a function that has `story.init()`.

```typescript
// Fails lint
test('my test', async ({ page }, testInfo) => {
  given('something', async () => {}); // Error: must be inside story() or story.init() scope
});

// Passes lint — inside story() callback
story('Login', () => {
  given('a user', async () => {});
  when('they sign in', async () => {});
  then('they see the dashboard', async () => {});
});

// Passes lint — story.init() in same scope
test('my test', async ({ page }, testInfo) => {
  story.init(testInfo);
  given('a user', async () => {});
});
```

### Rule: require-test-context-for-doc-story

Ensures `doc.story(title)` is called inside a `test()` callback.

```typescript
// Fails lint
function setup() {
  doc.story('My story'); // Error: must be inside test() callback
}

// Passes lint
test('my test', async ({ page }, testInfo) => {
  doc.story('My story');
});

// Detects Playwright modifiers: test.only, test.skip, test.fixme, test.fail, test.slow
test.skip('skipped test', async ({ page }, testInfo) => {
  doc.story('My story'); // Passes lint
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
import playwrightStories from 'eslint-plugin-executable-stories-playwright';

export default [...playwrightStories.configs.recommended];
```

This plugin only supports ESLint 9 flat config.

Source: packages/eslint-plugin-executable-stories-playwright/src/index.ts

### MEDIUM Not scoping rules to story test files

```typescript
// eslint.config.mjs
import playwrightStories from 'eslint-plugin-executable-stories-playwright';

export default [
  {
    // Scope to story test files only
    files: ['**/*.story.spec.ts', '**/*.story.test.ts'],
    plugins: {
      'executable-stories-playwright': playwrightStories,
    },
    rules: {
      'executable-stories-playwright/require-init-before-steps': 'error',
      'executable-stories-playwright/require-story-context-for-steps': 'error',
      'executable-stories-playwright/require-test-context-for-doc-story':
        'error',
    },
  },
];
```

Scoping avoids false positives on non-story test files that don't use the story API.

Source: packages/eslint-plugin-executable-stories-playwright/src/index.ts
