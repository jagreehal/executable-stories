---
title: Installation (Jest)
description: Install Jest and executable-stories-jest and add the reporter
---

## Install the packages

```bash
pnpm add -D jest executable-stories-jest
```

Or with npm:

```bash
npm install -D jest executable-stories-jest
```

## Add the reporter

In `jest.config.js` (or `jest.config.mjs`), add the Story reporter and setup:

```javascript
export default {
  // ... your existing config
  setupFilesAfterEnv: ['executable-stories-jest/setup'],
  reporters: [
    'default',
    [
      'executable-stories-jest/reporter',
      {
        formats: ['markdown'],
        outputDir: 'docs',
        outputName: 'user-stories',
        output: { mode: 'aggregated' },
      },
    ],
  ],
};
```

## Default output

With the option above, the reporter writes to **`docs/user-stories.md`**. Run your tests:

```bash
pnpm jest
```

The Markdown file is generated after the test run.

## Next

[First Story (Jest)](/getting-started/first-story-jest/) — write your first scenario.

[Jest reporter options](/reference/jest-config/) — all configuration options.
