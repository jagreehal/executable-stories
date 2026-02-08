import type { ESLint, Linter } from 'eslint';
import requireStoryContextForSteps from './rules/require-story-context-for-steps.js';
import requireTestContextForDocStory from './rules/require-test-context-for-doc-story.js';

const rules = {
  'require-story-context-for-steps': requireStoryContextForSteps,
  'require-test-context-for-doc-story': requireTestContextForDocStory,
};

const configs: Record<string, Linter.Config[]> = {
  recommended: [
    {
      plugins: {
        'executable-stories-playwright': { rules },
      },
      rules: {
        'executable-stories-playwright/require-story-context-for-steps':
          'error',
        'executable-stories-playwright/require-test-context-for-doc-story':
          'error',
      },
    },
  ],
};

const plugin: ESLint.Plugin = {
  meta: {
    name: 'eslint-plugin-executable-stories-playwright',
    version: '0.1.0',
  },
  rules,
  configs,
};

export default plugin;
export { rules, configs };
