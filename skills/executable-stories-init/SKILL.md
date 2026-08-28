---
name: executable-stories-init
description: Bootstrap executable-stories into a repo from zero. Installs Vitest and/or Playwright if missing, wires the StoryReporter, drops a sample story test, and adds a test script. Use when the user wants to "set up executable-stories", "add story testing to this repo", "initialize executable-stories", "bootstrap from scratch", or runs `pnpm dlx executable-stories-init`. Mirrors the `executable-stories-init` CLI; prefer the CLI when available, otherwise follow the manual checklist.
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

Write `vitest.config.ts`. Use the `createStoryReporter()` factory — it is correctly
typed for Vitest's `reporters` array, so no `createRequire` and no casts:
```ts
import { defineConfig } from 'vitest/config';
import { createStoryReporter } from 'executable-stories-vitest/reporter';

export default defineConfig({
  test: {
    reporters: [
      'default',
      createStoryReporter({
        formats: ['markdown', 'html'],
        outputDir: 'reports',
        outputName: 'executable-stories',
        rawRunPath: 'reports/raw-run.json',
      }),
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

Add `package.json` script:
- `"test": "vitest run"` (StoryReporter writes the report during the run; no separate report script)

### 4. Playwright setup

Install:
```bash
pnpm add -D @playwright/test executable-stories-playwright executable-stories-formatters
pnpm exec playwright install
```

Write `playwright.config.ts`. Playwright resolves reporters by module id, so the
plain string works — no `createRequire`:
```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testMatch: '**/*.story.spec.ts',
  reporter: [
    ['list'],
    [
      'executable-stories-playwright/reporter',
      { formats: ['markdown', 'html'], outputDir: 'reports', rawRunPath: 'reports/raw-run.json' },
    ],
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

### 6. Scaffold the living-docs site (default — skip only if the user declines)

The Astro site is the first-class human surface: browsable stories, the Scenario
Explorer, persona views, journeys, UI states, and explainer pages with freshness
banners. The single-file HTML report stays available as a per-run artifact (CI
attachments, email), but a bootstrap is not complete without the site. Running
tests never creates it: scaffold it once and let it consume every later run.

```bash
npx executable-stories init-astro --install   # scaffold ./story-docs + install deps
```

Then confirm the loop works end to end:

- Terminal 1: the test command in watch mode (updates `reports/by-file/`; `raw-run.json` remains the current execution event)
- Terminal 2: `npx executable-stories dev` — stories hot-reload on every test run
  (it finds `./story-docs`, installs its deps if missing, and runs the dev server)

The site shows bundled sample scenarios until the first real run lands. All site
configuration lives in `story-docs/executable-stories.config.mjs`. Start with
one source and add stakeholder surfaces only when the suite carries the relevant
tags or data:

```js
import { defineExecutableStories } from 'executable-stories-astro';

export default defineExecutableStories({
  source: '../reports/by-file',
  groupBy: 'feature',
  views: [
    {
      base: '/for/product',
      include: { tags: ['audience:stakeholder'] },
      groupBy: 'tag',
    },
    { base: '/for/design', include: { tags: ['storyboard'] } },
  ],
  // historyFile: '../reports/history.json', // same store as CLI --history-file
});
```

- `journey:<id>:<n>` tags create ordered pages under `/journeys`.
- `state:<name>` and `viewport:<name>` feed `/states`.
- Existing Figma/Zeplin/Sketch/Abstract `story.link()` docs appear as design
  context on story and journey pages.
- Two or more `sources` enable `/drift`; use `injectDrift` and `driftBase` to
  override it.
- `historyFile` adds recent-run stability to journeys. Ensure the test or CI
  command actually maintains that file with CLI `--history-file`.

Add `docs:dev` / `docs:build` scripts to the host package.json pointing into
`story-docs/` so the site is one command away. Do not use the removed
`build-docs` command or expect the GitHub Action to create a portal project.

For a multi-repository hub, configure named `sources` in one Astro project and
publish each product run after tests:

```yaml
permissions:
  contents: write
steps:
  - uses: jagreehal/executable-stories-action@v2
    with:
      mode: publish-run
      run-json: reports/raw-run.json
      runs-path: web/raw-run.json
```

Fetch each `published-run-url` before the hub build. Assign a distinct
`runs-path` per suite and serialize heavily parallel publishers when they share
the same runs branch.

### 7. Wire agent backpressure (recommended)

Give a coding agent (or a `/loop`) a signal it can act on after every change. In `CLAUDE.md` / `AGENTS.md`:

```text
After changing code:
- run the test command
- run: executable-stories check reports/raw-run.json
- fix every failure it reports before asking for review. Do not edit a scenario to make it pass.
```

`check` compresses passing scenarios to a count and expands each failure with its Given/When/Then, the failing step, and the code it `covers`; it exits non-zero on failures. For unattended loops, `goal` gives a definition-of-done and `triage` a worklist. See the `formatters-cli` skill and the docs guide "Agent loops and backpressure".

## When to stop and ask

- Monorepo with multiple candidate packages → ask which to bootstrap (don't assume root)
- Existing `vitest.config.ts` / `playwright.config.ts` with reporters → show the diff, don't clobber
- Non-TypeScript repo → ask before adding `tsconfig.json` or using `.ts` examples
