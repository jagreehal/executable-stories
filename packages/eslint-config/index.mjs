/**
 * Shared ESLint flat config (awaitly-style base).
 * @see https://github.com/jagreehal/awaitly/blob/main/packages/awaitly/eslint.config.mjs
 */
import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'lib/**',
      'dist/**',
      'coverage/**',
      '**/.executable-stories-jest/**',
      '**/.jest-story-docs/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      // Allow underscore-prefixed variables to be unused (common TS convention)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // No dynamic import() - use static imports for predictable bundling and tree-shaking
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportExpression',
          message: 'Dynamic import() is not allowed. Use static import instead.',
        },
      ],
    },
  },
  // Exceptions: reporter (optional @actions/core), error-handling tests (isolated module load)
  {
    files: ['**/reporter.ts', '**/__tests__/error-handling.test.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
);
