# eslint-plugin-executable-stories-jest

ESLint rules for [executable-stories-jest](https://github.com/jagreehal/executable-stories). Use with Jest to catch common mistakes when writing story tests.

## Install

```bash
pnpm add -D eslint-plugin-executable-stories-jest
```

Requires ESLint 9+ (flat config).

## Usage (flat config)

```js
import jestExecutableStories from 'eslint-plugin-executable-stories-jest';

export default [
  {
    plugins: {
      'executable-stories-jest': jestExecutableStories,
    },
    rules: {
      ...jestExecutableStories.configs.recommended[0].rules,
    },
  },
];
```

Or spread the recommended config:

```js
import jestExecutableStories from 'eslint-plugin-executable-stories-jest';

export default [...jestExecutableStories.configs.recommended];
```

## Rules

| Rule                                  | Description                                                                                                 | Config      |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------- |
| `require-init-before-steps`           | Step and doc calls must follow `story.init()` in the same test.                                             | recommended |
| `require-story-context-for-steps`     | Legacy guard: top-level `given/when/then/and/but` must be inside an executable story context.               | recommended |

Prefer describe/it + `story.init()` + `story.given`/`story.when`/`story.then`. Top-level step helpers remain exported for compatibility.

## Configs

| Config        | Description             |
| ------------- | ----------------------- |
| `recommended` | Enables the rules above |

## License

MIT
