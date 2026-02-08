import type { ESLint, Linter } from 'eslint';
import requireInitBeforeSteps from './rules/require-init-before-steps.js';
import requireTaskForStoryInit from './rules/require-task-for-story-init.js';
import requireTestContextForStoryInit from './rules/require-test-context-for-story-init.js';

const rules = {
  'require-task-for-story-init': requireTaskForStoryInit,
  'require-test-context-for-story-init': requireTestContextForStoryInit,
  'require-init-before-steps': requireInitBeforeSteps,
};

const configs: Record<string, Linter.Config[]> = {
  recommended: [
    {
      plugins: {
        'executable-stories-vitest': { rules },
      },
      rules: {
        'executable-stories-vitest/require-task-for-story-init': 'error',
        'executable-stories-vitest/require-test-context-for-story-init':
          'error',
        'executable-stories-vitest/require-init-before-steps': 'error',
      },
    },
  ],
};

const plugin: ESLint.Plugin = {
  meta: {
    name: 'eslint-plugin-executable-stories-vitest',
    version: '0.2.0',
  },
  rules,
  configs,
};

export default plugin;
export { rules, configs };
