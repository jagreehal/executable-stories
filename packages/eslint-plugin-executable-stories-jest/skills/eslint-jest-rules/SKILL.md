---
name: eslint-jest-rules
description: >
  ESLint flat config plugin for executable-stories-jest. Three rules:
  require-init-before-steps (init before given/when/then),
  require-story-context-for-steps (steps must be inside story callback or story.init scope),
  require-test-context-for-doc-story (doc.story must be inside test/it).
  Recommended config enables all at error level.
type: core
library: eslint-plugin-executable-stories-jest
library_version: "0.1.0"
sources:
  - "jagreehal/executable-stories:packages/eslint-plugin-executable-stories-jest/src/index.ts"
---

# ESLint Plugin: executable-stories-jest

## Setup

```typescript
// eslint.config.mjs
import jestStories from "eslint-plugin-executable-stories-jest";

export default [
  // Option A: Use recommended config (enables all rules at error)
  ...jestStories.configs.recommended,

  // Option B: Manual configuration
  {
    plugins: {
      "executable-stories-jest": jestStories,
    },
    rules: {
      "executable-stories-jest/require-init-before-steps": "error",
      "executable-stories-jest/require-story-context-for-steps": "error",
      "executable-stories-jest/require-test-context-for-doc-story": "error",
    },
  },
];
```

## Core Patterns

### Rule: require-init-before-steps

Ensures `story.init()` is called before any step markers.

```typescript
// Fails lint
it("my test", () => {
  story.given("something", () => {}); // Error: story.init() must be called first
  story.init();
});

// Passes lint
it("my test", () => {
  story.init();
  story.given("something", () => {});
});
```

Detects all step methods: `given`, `when`, `then`, `and`, `but`, `arrange`, `act`, `assert`, `setup`, `context`, `execute`, `action`, `verify`, `fn`, `expect`.

### Rule: require-story-context-for-steps

Ensures bare step functions (`given`, `when`, `then`, `and`, `but` and aliases) are called inside a `story()` callback, `doc.story(..., callback)`, or a function that has `story.init()`.

```typescript
// Fails lint
it("my test", () => {
  given("something", () => {}); // Error: must be inside story() or story.init() scope
});

// Passes lint — inside story() callback
story("Login", () => {
  given("a user", () => {});
  when("they sign in", () => {});
  then("they see the dashboard", () => {});
});

// Passes lint — story.init() in same scope
it("my test", () => {
  story.init();
  given("a user", () => {});
});
```

### Rule: require-test-context-for-doc-story

Ensures `doc.story(title)` is called inside a `test()` or `it()` callback.

```typescript
// Fails lint
function setup() {
  doc.story("My story"); // Error: must be inside test/it callback
}

// Fails lint
it("my test", () => {
  doc.story(); // Error: requires a title argument
});

// Passes lint
it("my test", () => {
  doc.story("My story");
});

// Also detects modifiers: it.only, it.skip, it.todo, it.concurrent, it.failing
it.only("focused test", () => {
  doc.story("My story"); // Passes lint
});
```

## Common Mistakes

### HIGH Using legacy .eslintrc instead of flat config

Wrong:

```json
{
  "plugins": ["executable-stories-jest"],
  "rules": {
    "executable-stories-jest/require-story-context-for-steps": "error"
  }
}
```

Correct:

```typescript
// eslint.config.mjs (flat config)
import jestStories from "eslint-plugin-executable-stories-jest";

export default [...jestStories.configs.recommended];
```

This plugin only supports ESLint 9 flat config.

Source: packages/eslint-plugin-executable-stories-jest/src/index.ts

### MEDIUM Not scoping rules to story test files

```typescript
// eslint.config.mjs
import jestStories from "eslint-plugin-executable-stories-jest";

export default [
  {
    // Scope to story test files only
    files: ["**/*.story.test.ts", "**/*.story.spec.ts"],
    plugins: {
      "executable-stories-jest": jestStories,
    },
    rules: {
      "executable-stories-jest/require-init-before-steps": "error",
      "executable-stories-jest/require-story-context-for-steps": "error",
      "executable-stories-jest/require-test-context-for-doc-story": "error",
    },
  },
];
```

Scoping avoids false positives on non-story test files that don't use the story API.

Source: packages/eslint-plugin-executable-stories-jest/src/index.ts
