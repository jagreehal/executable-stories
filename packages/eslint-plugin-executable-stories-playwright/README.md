# eslint-plugin-executable-stories-playwright

ESLint rules for [executable-stories-playwright](https://github.com/jagreehal/executable-stories). Use with Playwright to catch common mistakes when writing story tests.

## Install

```bash
pnpm add -D eslint-plugin-executable-stories-playwright
```

Requires ESLint 9+ (flat config).

## Usage (flat config)

```js
import playwrightExecutableStories from 'eslint-plugin-executable-stories-playwright';

export default [
  {
    plugins: {
      'executable-stories-playwright': playwrightExecutableStories,
    },
    rules: {
      ...playwrightExecutableStories.configs.recommended[0].rules,
    },
  },
];
```

Or spread the recommended config:

```js
import playwrightExecutableStories from 'eslint-plugin-executable-stories-playwright';

export default [...playwrightExecutableStories.configs.recommended];
```

## Rules

| Rule                                 | Description                                                                                                 | Config      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ----------- |
| `require-story-context-for-steps`    | Ensure `given/when/then/and/but` (and aliases) are called inside `story(...)` or `doc.story(..., callback)` | recommended |
| `require-test-context-for-doc-story` | Ensure `doc.story(title)` is called inside a `test()` or `it()` callback (framework-native tests)           | recommended |

These rules apply only when the file uses legacy patterns (e.g. top-level steps or `doc.story()`). If you use test() + `story.init(testInfo)` + `story.given`/`story.when`/`story.then`, the rules do not run; the current API has no top-level steps and no `doc.story()`, so no changes are required.

## Configs

| Config        | Description             |
| ------------- | ----------------------- |
| `recommended` | Enables the rules above |

## License

MIT
