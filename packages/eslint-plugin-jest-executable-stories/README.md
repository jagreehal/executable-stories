# eslint-plugin-jest-executable-stories

ESLint rules for [jest-executable-stories](https://github.com/jagreehal/executable-stories). Use with Jest to catch common mistakes when writing story tests.

## Install

```bash
pnpm add -D eslint-plugin-jest-executable-stories
```

Requires ESLint 9+ (flat config).

## Usage (flat config)

```js
import jestExecutableStories from "eslint-plugin-jest-executable-stories";

export default [
  {
    plugins: {
      "jest-executable-stories": jestExecutableStories,
    },
    rules: {
      ...jestExecutableStories.configs.recommended[0].rules,
    },
  },
];
```

Or spread the recommended config:

```js
import jestExecutableStories from "eslint-plugin-jest-executable-stories";

export default [...jestExecutableStories.configs.recommended];
```

## Rules

| Rule | Description | Config |
|------|-------------|--------|
| `require-story-context-for-steps` | Ensure `given/when/then/and/but` (and aliases) are called inside `story(...)` or `doc.story(..., callback)` | recommended |
| `require-test-context-for-doc-story` | Ensure `doc.story(title)` is called inside a `test/it` callback (framework-native tests) | recommended |

## Configs

| Config | Description |
|--------|-------------|
| `recommended` | Enables the rules above |

## License

MIT
