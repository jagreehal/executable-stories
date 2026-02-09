# eslint-plugin-executable-stories-vitest

ESLint rules for [executable-stories-vitest](https://github.com/jagreehal/executable-stories). Use with Vitest to catch common mistakes: steps outside story context, `doc.story(title)` outside a test callback, or `doc.story("Title")` without the required `task` argument.

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

| Rule                                 | Description                                                                                                                       | Config      |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `require-story-context-for-steps`    | Step functions (`given`, `when`, `then`, etc.) must be called inside a `story()` or `doc.story()` callback.                       | recommended |
| `require-test-context-for-doc-story` | `doc.story(title)` must be called inside a `test`/`it` callback when using the native pattern (without a story callback).         | recommended |
| `require-task-for-doc-story`         | In Vitest, `doc.story(title, task)` requires the task argument. Use `it('...', ({ task }) => { doc.story('Title', task); ... })`. | recommended |

## Configs

| Config        | Description             |
| ------------- | ----------------------- |
| `recommended` | Enables all three rules |

## License

MIT
