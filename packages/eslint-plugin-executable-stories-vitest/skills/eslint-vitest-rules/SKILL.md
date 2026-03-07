---
name: eslint-vitest-rules
description: >
  ESLint flat config plugin for executable-stories-vitest. Three rules:
  require-task-for-story-init (story.init must have task argument),
  require-test-context-for-story-init (must be inside it/test callback),
  require-init-before-steps (init before given/when/then). Recommended
  config enables all at error level.
type: core
library: eslint-plugin-executable-stories-vitest
library_version: "0.2.0"
sources:
  - "jagreehal/executable-stories:packages/eslint-plugin-executable-stories-vitest/src/index.ts"
---

# ESLint Plugin: executable-stories-vitest

## Setup

```typescript
// eslint.config.mjs
import vitestStories from "eslint-plugin-executable-stories-vitest";

export default [
  // Option A: Use recommended config (enables all rules at error)
  ...vitestStories.configs.recommended,

  // Option B: Manual rule configuration
  {
    plugins: {
      "executable-stories-vitest": vitestStories,
    },
    rules: {
      "executable-stories-vitest/require-task-for-story-init": "error",
      "executable-stories-vitest/require-test-context-for-story-init": "error",
      "executable-stories-vitest/require-init-before-steps": "error",
    },
  },
];
```

## Core Patterns

### Rule: require-task-for-story-init

Ensures `story.init(task)` is called with the `task` argument.

```typescript
// Fails lint
it("my test", ({ task }) => {
  story.init(); // Error: story.init(task) requires the task argument
});

// Passes lint
it("my test", ({ task }) => {
  story.init(task);
});
```

### Rule: require-test-context-for-story-init

Ensures `story.init(task)` is called inside a `test()` or `it()` callback.

```typescript
// Fails lint
function helper() {
  story.init(task); // Error: must be inside a test/it callback
}

// Passes lint
it("my test", ({ task }) => {
  story.init(task);
});

// Also detects modifiers: it.only, it.skip, it.todo, it.concurrent, it.fails
it.only("focused test", ({ task }) => {
  story.init(task); // Passes lint
});
```

### Rule: require-init-before-steps

Ensures `story.init(task)` is called before any step markers.

```typescript
// Fails lint
it("my test", ({ task }) => {
  story.given("something"); // Error: story.init(task) must be called first
  story.init(task);
});

// Passes lint
it("my test", ({ task }) => {
  story.init(task);
  story.given("something");
});
```

Detects all step methods: `given`, `when`, `then`, `and`, `but`, `arrange`, `act`, `assert`, `setup`, `context`, `execute`, `action`, `verify`.

## Common Mistakes

### HIGH Using legacy .eslintrc instead of flat config

Wrong:

```json
{
  "plugins": ["executable-stories-vitest"],
  "rules": {
    "executable-stories-vitest/require-task-for-story-init": "error"
  }
}
```

Correct:

```typescript
// eslint.config.mjs (flat config)
import vitestStories from "eslint-plugin-executable-stories-vitest";

export default [...vitestStories.configs.recommended];
```

This plugin only supports ESLint 9 flat config. Legacy `.eslintrc` format is not supported.

Source: packages/eslint-plugin-executable-stories-vitest/src/index.ts

### MEDIUM Not scoping rules to story test files

```typescript
// eslint.config.mjs
import vitestStories from "eslint-plugin-executable-stories-vitest";

export default [
  {
    // Scope to story test files only
    files: ["**/*.story.test.ts", "**/*.story.spec.ts"],
    plugins: {
      "executable-stories-vitest": vitestStories,
    },
    rules: {
      "executable-stories-vitest/require-task-for-story-init": "error",
      "executable-stories-vitest/require-test-context-for-story-init": "error",
      "executable-stories-vitest/require-init-before-steps": "error",
    },
  },
];
```

Scoping avoids false positives on non-story test files that don't use the story API.

Source: packages/eslint-plugin-executable-stories-vitest/src/index.ts
