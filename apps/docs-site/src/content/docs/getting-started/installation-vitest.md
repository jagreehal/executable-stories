---
title: Installation (Vitest)
description: Install Vitest and vitest-executable-stories and add the reporter
---

## Install the packages

```bash
pnpm add -D vitest vitest-executable-stories
```

Or with npm:

```bash
npm install -D vitest vitest-executable-stories
```

## Add the reporter

In `vitest.config.ts`, import the reporter from the **`/reporter`** subpath so the config does not load the main package (which imports Vitest and can cause "Vitest failed to access its internal state" when loaded inside the config file):

```typescript
import { defineConfig } from "vitest/config";
import { StoryReporter } from "vitest-executable-stories/reporter";

export default defineConfig({
  test: {
    reporters: ["default", new StoryReporter()],
  },
});
```

## Default output

With no options, the reporter writes to **`docs/user-stories.md`**. Run your tests:

```bash
pnpm vitest run
```

The Markdown file is generated after the test run.

## Next

[First Story (Vitest)](/getting-started/first-story-vitest/) — write your first scenario and see the generated docs.

[Vitest reporter options](/reference/vitest-config/) — all configuration options.
