# eslint-plugin-playwright-executable-stories

ESLint rules for [playwright-executable-stories](https://github.com/jagreehal/executable-stories). Use with Playwright to catch common mistakes when writing story tests.

## Install

```bash
pnpm add -D eslint-plugin-playwright-executable-stories
```

Requires ESLint 9+ (flat config).

## Usage (flat config)

```js
import playwrightExecutableStories from "eslint-plugin-playwright-executable-stories";

export default [
  {
    plugins: {
      "playwright-executable-stories": playwrightExecutableStories,
    },
    rules: {
      ...playwrightExecutableStories.configs.recommended[0].rules,
    },
  },
];
```

Or spread the recommended config:

```js
import playwrightExecutableStories from "eslint-plugin-playwright-executable-stories";

export default [...playwrightExecutableStories.configs.recommended];
```

## Rules

| Rule | Description | Config |
|------|-------------|--------|
| `require-story-context-for-steps` | Ensure `given/when/then/and/but` (and aliases) are called inside `story(...)` or `doc.story(..., callback)` | recommended |
| `require-test-context-for-doc-story` | Ensure `doc.story(title)` is called inside a `test()` or `it()` callback (framework-native tests) | recommended |

## Configs

| Config | Description |
|--------|-------------|
| `recommended` | Enables the rules above |

## License

MIT
