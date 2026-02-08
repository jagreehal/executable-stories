import baseConfig from 'eslint-config-executable-stories';
import vitestExecutableStories from 'eslint-plugin-executable-stories-vitest';

export default [
  ...baseConfig,
  {
    plugins: {
      'executable-stories-vitest': vitestExecutableStories,
    },
    rules: {
      ...vitestExecutableStories.configs.recommended[0].rules,
    },
  },
];
