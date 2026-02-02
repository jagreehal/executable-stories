import baseConfig from "eslint-config-executable-stories";
import vitestExecutableStories from "eslint-plugin-vitest-executable-stories";

export default [
  ...baseConfig,
  {
    plugins: {
      "vitest-executable-stories": vitestExecutableStories,
    },
    rules: {
      ...vitestExecutableStories.configs.recommended[0].rules,
    },
  },
];
