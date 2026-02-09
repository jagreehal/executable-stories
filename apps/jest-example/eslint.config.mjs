import baseConfig from 'eslint-config-executable-stories';
import jestExecutableStories from 'eslint-plugin-executable-stories-jest';

export default [
  ...baseConfig,
  {
    languageOptions: {
      globals: { process: 'readonly' },
    },
  },
  {
    plugins: {
      'executable-stories-jest': jestExecutableStories,
    },
    rules: {
      ...jestExecutableStories.configs.recommended[0].rules,
    },
  },
];
