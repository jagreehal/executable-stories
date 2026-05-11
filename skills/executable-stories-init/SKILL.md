---
name: executable-stories-init
description: Bootstrap executable-stories into a repo from zero. Installs Vitest and/or Playwright if missing, wires the StoryReporter, drops a sample story test, and adds a report script. Use when the user wants to "set up executable-stories", "add story testing to this repo", "initialize executable-stories", "bootstrap from scratch", or runs `pnpm dlx executable-stories-init`. Mirrors the `executable-stories-init` CLI; prefer the CLI when available, otherwise follow the manual checklist.
---

# Bootstrapping executable-stories

## Fast path

```bash
pnpm dlx executable-stories-init      # or: npx executable-stories-init
```

Detects framework + monorepo layout, prompts for missing info, writes everything. Skip the rest of this skill when the CLI succeeds.

## Manual checklist

When the CLI is unavailable, do these in order.

### 1. Detect

- Package manager: read `packageManager` field in root `package.json`
- Existing test framework: look for `vitest` or `@playwright/test` in `devDependencies`
- Monorepo: check for `pnpm-workspace.yaml` or `workspaces` in root `package.json`. If present, ask the user which package to target
- TypeScript: check for `tsconfig.json`. If missing, ask before writing one

### 2. Choose framework

Ask the user which to set up (skip if already detected):
- Vitest (unit/integration)
- Playwright (e2e)
- Both

### 3. Vitest setup

Install:
```bash
pnpm add -D vitest executable-stories-vitest executable-stories-formatters
```

Write `vitest.config.ts` (use `createRequire` form — avoids a Vitest `Reporter` type mismatch):
```ts
import { createRequire } from 'node:module';
import type { Reporter } from 'vitest/node';
import { defineConfig } from 'vitest/config';

const require = createRequire(import.meta.url);
const { StoryReporter } = require('executable-stories-vitest/reporter');

export default defineConfig({
  test: {
    reporters: [
      'default',
      new StoryReporter({
        formats: ['markdown', 'html'],
        outputDir: 'reports',
        outputName: 'executable-stories',
        rawRunPath: 'reports/raw-run.json',
      }) as unknown as Reporter,
    ],
  },
});
```

Drop `src/example.story.test.ts`:
```ts
import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';

describe('Calculator', () => {
  it('Adds two numbers', ({ task }) => {
    story.init(task);

    story.given('two numbers');
    const a = 1;
    const b = 2;

    story.when('they are added');
    const result = a + b;

    story.then('the sum is 3');
    expect(result).toBe(3);
  });
});
```

Add `package.json` scripts:
- `"test": "vitest run"`
- `"report": "vitest run"` (StoryReporter writes the report during the run)

### 4. Playwright setup

Install:
```bash
pnpm add -D @playwright/test executable-stories-playwright executable-stories-formatters
pnpm exec playwright install
```

Write `playwright.config.ts`:
```ts
import { createRequire } from 'node:module';
import { defineConfig } from '@playwright/test';

const require = createRequire(import.meta.url);
const reporterPath = require.resolve('executable-stories-playwright/reporter');

export default defineConfig({
  testMatch: '**/*.story.spec.ts',
  reporter: [
    ['list'],
    [reporterPath, { formats: ['markdown', 'html'], outputDir: 'reports' }],
  ],
});
```

Drop `tests/example.story.spec.ts`:
```ts
import { expect, test } from '@playwright/test';
import { given, then, when } from 'executable-stories-playwright';

test('Loads example.com', async ({ page }) => {
  await given('a fresh browser context', async () => {});
  await when('the user visits example.com', async () => {
    await page.goto('https://example.com');
  });
  await then('the title contains Example', async () => {
    await expect(page).toHaveTitle(/Example/);
  });
});
```

Add scripts: `"test:e2e": "playwright test"`.

### 5. Verify

- Run `pnpm install`
- Run the test command — should pass and write to `reports/`
- Show the user the generated `reports/executable-stories.html` and `reports/executable-stories.md`

## When to stop and ask

- Monorepo with multiple candidate packages → ask which to bootstrap (don't assume root)
- Existing `vitest.config.ts` / `playwright.config.ts` with reporters → show the diff, don't clobber
- Non-TypeScript repo → ask before adding `tsconfig.json` or using `.ts` examples
