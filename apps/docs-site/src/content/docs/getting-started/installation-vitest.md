---
title: Installation (Vitest)
description: Install Vitest and executable-stories-vitest and add the reporter
---

## Install the packages

```bash
pnpm add -D vitest executable-stories-vitest
```

Or with npm:

```bash
npm install -D vitest executable-stories-vitest
```

## Add the reporter

In `vitest.config.ts`, import the reporter from the **`/reporter`** subpath so the config does not load the main package (which imports Vitest and can cause "Vitest failed to access its internal state" when loaded inside the config file):

```typescript
import { StoryReporter } from 'executable-stories-vitest/reporter';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: ['default', new StoryReporter()],
  },
});
```

## Default output

With no options, the reporter uses the formatters package defaults (e.g. Cucumber JSON in `reports/`). To write Markdown to **`docs/user-stories.md`**, pass options to `StoryReporter` (see [Vitest reporter options](/reference/vitest-config/) — e.g. `formats: ['markdown']`, `outputDir: 'docs'`, `outputName: 'user-stories'`). Run your tests:

```bash
pnpm vitest run
```

The Markdown file is generated after the test run.

## Next

[First Story (Vitest)](/getting-started/first-story-vitest/) — write your first scenario and see the generated docs.

[Vitest reporter options](/reference/vitest-config/) — all configuration options.
