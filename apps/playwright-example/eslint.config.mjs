import baseConfig from 'eslint-config-executable-stories';
import playwrightExecutableStories from 'eslint-plugin-executable-stories-playwright';

export default [
  ...baseConfig,
  {
    languageOptions: {
      globals: { process: 'readonly' },
    },
  },
  {
    plugins: {
      'executable-stories-playwright': playwrightExecutableStories,
    },
    rules: {
      ...playwrightExecutableStories.configs.recommended[0].rules,
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.story.spec.ts'],
    rules: {
      'no-empty-pattern': 'off',
    },
  },
];
