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

| Rule                                  | Description                                                                                                 | Config      |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------- |
| `require-init-before-steps`           | Step and doc calls must follow `story.init(testInfo)` in the same test.                                     | recommended |
| `require-story-context-for-steps`     | Legacy guard: top-level `given/when/then/and/but` must be inside an executable story context.               | recommended |
| `require-test-context-for-doc-story`  | Legacy guard: `doc.story(title)` must be called inside a `test()` callback.                                 | recommended |

Prefer `test()` + `story.init(testInfo)` + `story.given`/`story.when`/`story.then`. Top-level step helpers remain exported for compatibility.

## Configs

| Config        | Description             |
| ------------- | ----------------------- |
| `recommended` | Enables the rules above |

## License

MIT
