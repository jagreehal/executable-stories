import config from 'eslint-config-executable-stories';

export default [
  ...config,
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/next-env.d.ts',
      '**/mockServiceWorker.js',
      '**/test-results/**',
      'examples/docs-walkthrough/docs/**',
      'examples/docs-walkthrough/reports/**',
    ],
  },
  // The apps load the session first, then import the router, so it reads the scenario's URL.
  { rules: { 'no-restricted-syntax': 'off' } },
  // Snippets the README and skills quote verbatim (tests/docs.test.ts); they stop where the doc does.
  { files: ['docs/examples/**'], rules: { '@typescript-eslint/no-unused-vars': 'off' } },
  { files: ['**/*.mjs'], languageOptions: { globals: { console: 'readonly', process: 'readonly' } } },
];
