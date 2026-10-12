import config from 'eslint-config-executable-stories';

export default [
  ...config,
  { ignores: ['dist/**'] },
  // Optional peers (msw, Playwright) and page hooks load on first use, so apps that never need them never pay for them.
  { rules: { 'no-restricted-syntax': 'off' } },
];
