---
title: ESLint plugins
description: One ESLint plugin per framework to catch common mistakes
---

There is one ESLint plugin per framework. Use the plugin for your test runner to enforce executable-stories patterns at lint time.

| Framework | Package | Rules (v1) |
|-----------|---------|-----------|
| Jest | `eslint-plugin-jest-executable-stories` | _(none)_ |
| Vitest | `eslint-plugin-vitest-executable-stories` | `require-task-for-doc-story` |
| Playwright | `eslint-plugin-playwright-executable-stories` | _(none)_ |

Requires ESLint 9+ (flat config).

## Install

**Vitest:**

```bash
pnpm add -D eslint-plugin-vitest-executable-stories
```

**Jest:**

```bash
pnpm add -D eslint-plugin-jest-executable-stories
```

**Playwright:**

```bash
pnpm add -D eslint-plugin-playwright-executable-stories
```

## Usage (flat config)

**Vitest** — spread the recommended config:

```javascript
import vitestExecutableStories from "eslint-plugin-vitest-executable-stories";

export default [
  ...vitestExecutableStories.configs.recommended,
];
```

Or register the plugin and enable rules manually:

```javascript
import vitestExecutableStories from "eslint-plugin-vitest-executable-stories";

export default [
  {
    plugins: {
      "vitest-executable-stories": vitestExecutableStories,
    },
    rules: {
      "vitest-executable-stories/require-task-for-doc-story": "error",
    },
  },
];
```

**Jest** and **Playwright** — same pattern; spread `configs.recommended` or add the plugin and rules. In v1 they have no rules but export config for future use.

## Vitest rule: require-task-for-doc-story

In Vitest, `doc.story("Title")` with one argument does not attach the story to the test. The **task** argument is required: `doc.story("Title", task)` with `it('...', ({ task }) => { ... })`.

This rule reports `doc.story("Title");` and suggests the fix.

**Invalid:**

```typescript
it("my test", () => {
  doc.story("My story");  // reported: missing task
  expect(1).toBe(1);
});
```

**Valid:**

```typescript
it("my test", ({ task }) => {
  doc.story("My story", task);
  expect(1).toBe(1);
});
```

## Using with official framework ESLint plugins

Our plugins do not depend on or bundle the official framework ESLint plugins (e.g. [eslint-plugin-playwright](https://www.npmjs.com/package/eslint-plugin-playwright)). You can use both: install the official plugin for framework best practices and our plugin for executable-stories rules. In your flat config, spread or merge both configs.
