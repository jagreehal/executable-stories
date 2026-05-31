# eslint-plugin-executable-stories-vitest

ESLint rules for [executable-stories-vitest](https://github.com/jagreehal/executable-stories). Use with Vitest to catch common mistakes when writing story tests. Current Vitest usage is `story.init(task)` plus `story.given` / `story.when` / `story.then`.

## Install

```bash
pnpm add -D eslint-plugin-executable-stories-vitest
```

Requires ESLint 9+ (flat config).

## Usage (flat config)

```js
import vitestExecutableStories from 'eslint-plugin-executable-stories-vitest';

export default [
  {
    plugins: {
      'executable-stories-vitest': vitestExecutableStories,
    },
    rules: {
      ...vitestExecutableStories.configs.recommended[0].rules,
    },
  },
];
```

Or spread the recommended config:

```js
import vitestExecutableStories from 'eslint-plugin-executable-stories-vitest';

export default [...vitestExecutableStories.configs.recommended];
```

## Rules

| Rule                                      | Description                                                                                  | Config      |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- | ----------- |
| `require-task-for-story-init`             | `story.init(task)` must receive the Vitest `task` argument from the test callback.            | recommended |
| `require-test-context-for-story-init`     | `story.init(...)` must be called inside a `test`/`it` callback.                              | recommended |
| `require-init-before-steps`               | Step and doc calls on `story` must follow `story.init(...)` in the same test.                | recommended |

## Configs

| Config        | Description             |
| ------------- | ----------------------- |
| `recommended` | Enables all three rules |

## License

MIT
