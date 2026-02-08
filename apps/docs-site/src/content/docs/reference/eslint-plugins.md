---
title: ESLint plugins
description: One ESLint plugin per framework to catch common mistakes
---

There is one ESLint plugin per framework. Use the plugin for your test runner to enforce executable-stories patterns at lint time.

| Framework  | Package                                       | Rules                                                                                             |
| ---------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Jest       | `eslint-plugin-executable-stories-jest`       | _(none)_                                                                                          |
| Vitest     | `eslint-plugin-executable-stories-vitest`     | `require-task-for-story-init`, `require-test-context-for-story-init`, `require-init-before-steps` |
| Playwright | `eslint-plugin-executable-stories-playwright` | `require-story-context-for-steps`, `require-test-context-for-doc-story`                           |

Requires ESLint 9+ (flat config).

## Install

**Vitest:**

```bash
pnpm add -D eslint-plugin-executable-stories-vitest
```

**Jest:**

```bash
pnpm add -D eslint-plugin-executable-stories-jest
```

**Playwright:**

```bash
pnpm add -D eslint-plugin-executable-stories-playwright
```

## Usage (flat config)

**Vitest** — spread the recommended config:

```javascript
import vitestExecutableStories from 'eslint-plugin-executable-stories-vitest';

export default [...vitestExecutableStories.configs.recommended];
```

Or register the plugin and enable rules manually:

```javascript
import vitestExecutableStories from 'eslint-plugin-executable-stories-vitest';

export default [
  {
    plugins: {
      'executable-stories-vitest': vitestExecutableStories,
    },
    rules: {
      'executable-stories-vitest/require-task-for-story-init': 'error',
      'executable-stories-vitest/require-test-context-for-story-init': 'error',
      'executable-stories-vitest/require-init-before-steps': 'error',
    },
  },
];
```

**Jest** — same pattern; spread `configs.recommended` or add the plugin. Jest has no rules but exports config for future use.

**Playwright** — spread the recommended config to enable the two rules:

```javascript
import playwrightExecutableStories from 'eslint-plugin-executable-stories-playwright';

export default [...playwrightExecutableStories.configs.recommended];
```

Or enable rules manually:

```javascript
import playwrightExecutableStories from 'eslint-plugin-executable-stories-playwright';

export default [
  {
    plugins: {
      'executable-stories-playwright': playwrightExecutableStories,
    },
    rules: {
      'executable-stories-playwright/require-story-context-for-steps': 'error',
      'executable-stories-playwright/require-test-context-for-doc-story': 'error',
    },
  },
];
```

## Vitest rules

### require-task-for-story-init

`story.init()` must be called with the **task** argument from the test callback so the story is attached to the correct test. Use `it('...', ({ task }) => { story.init(task); ... })`.

**Invalid:**

```typescript
it('my test', () => {
  story.init(); // reported: missing task
  story.given('setup');
});
```

**Valid:**

```typescript
it('my test', ({ task }) => {
  story.init(task);
  story.given('setup');
});
```

### require-test-context-for-story-init

`story.init(task)` must be called from inside a Vitest test (e.g. inside an `it()` callback), not at the top level or in a describe callback. This rule reports when `story.init` is used outside a test context.

### require-init-before-steps

Step functions (`story.given`, `story.when`, `story.then`, etc.) and doc methods (`story.note`, `story.json`, etc.) must be called only **after** `story.init(task)` in the same test. This rule reports when steps or doc methods are used without a preceding `story.init()` in scope.

**Invalid:**

```typescript
it('my test', ({ task }) => {
  story.given('setup'); // reported: story.init() must be called first
});
```

**Valid:**

```typescript
it('my test', ({ task }) => {
  story.init(task);
  story.given('setup');
});
```

## Playwright rules

### require-story-context-for-steps

Step functions (`story.given`, `story.when`, `story.then`, etc.) and their aliases must be called **inside** a Playwright test callback (e.g. inside `test('...', async ({ page }) => { ... })`), not at the top level or in a describe callback. This rule ensures steps are attached to a test so the reporter can associate them with the correct scenario.

**Invalid:**

```typescript
test.describe('Login', () => {
  story.given('user is on login page'); // reported: steps must be inside a test
  test('user logs in', async ({ page }, testInfo) => {
    story.init(testInfo);
    story.when('user submits credentials');
    story.then('user sees dashboard');
  });
});
```

**Valid:**

```typescript
test.describe('Login', () => {
  test('user logs in', async ({ page }, testInfo) => {
    story.init(testInfo);
    story.given('user is on login page');
    story.when('user submits credentials');
    story.then('user sees dashboard');
  });
});
```

### require-test-context-for-doc-story

If you use **`doc.story(title)`** to attach story metadata to a plain `test()` (framework-native pattern), it must be called **inside** the test callback, not at the top level or in a describe. This rule ensures the story title is associated with the correct test.

**Invalid:**

```typescript
test.describe('Login', () => {
  doc.story('User logs in'); // reported: doc.story must be inside a test
  test('user logs in', async ({ page }, testInfo) => {
    story.init(testInfo);
    story.given('user is on login page');
  });
});
```

**Valid:**

```typescript
test('user logs in', async ({ page }, testInfo) => {
  doc.story('User logs in');
  story.init(testInfo);
  story.given('user is on login page');
  story.when('user submits credentials');
  story.then('user sees dashboard');
});
```

## Using with official framework ESLint plugins

Our plugins do not depend on or bundle the official framework ESLint plugins (e.g. [eslint-plugin-playwright](https://www.npmjs.com/package/eslint-plugin-playwright)). You can use both: install the official plugin for framework best practices and our plugin for executable-stories rules. In your flat config, spread or merge both configs.
