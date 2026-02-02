---
title: Installation (Jest)
description: Install Jest and jest-executable-stories and add the reporter
---

## Install the packages

```bash
pnpm add -D jest jest-executable-stories
```

Or with npm:

```bash
npm install -D jest jest-executable-stories
```

## Add the reporter

In `jest.config.js` (or `jest.config.ts`), add the StoryReporter:

```javascript
module.exports = {
  // ... your existing config
  reporters: [
    "default",
    ["jest-executable-stories/reporter", { output: "docs/user-stories.md" }],
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
