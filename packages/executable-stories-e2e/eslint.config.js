import config from 'eslint-config-executable-stories';

export default [
  ...config,
  { ignores: ['reports/**', '.executable-stories/**'] },
];
