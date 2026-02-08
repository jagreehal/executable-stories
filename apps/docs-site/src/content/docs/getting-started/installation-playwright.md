---
title: Installation (Playwright)
description: Install Playwright and executable-stories-playwright and add the reporter
---

## Install the packages

```bash
pnpm add -D @playwright/test executable-stories-playwright
```

Or with npm:

```bash
npm install -D @playwright/test executable-stories-playwright
```

## Add the reporter

In `playwright.config.ts`, add the reporter using the package path so Playwright loads it correctly:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    [
      'executable-stories-playwright/reporter',
      {
        formats: ['markdown'],
        outputDir: 'docs',
        outputName: 'user-stories',
        output: { mode: 'aggregated' },
      },
    ],
  ],
  // ... rest of config
});
```

## Default output

With the option above, the reporter writes to **`docs/user-stories.md`**. Run your tests:

```bash
pnpm playwright test
```

The Markdown file is generated after the test run.

## Next

[First Story (Playwright)](/getting-started/first-story-playwright/) — write your first scenario.

[Playwright reporter options](/reference/playwright-config/) — all configuration options.
