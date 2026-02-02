import baseConfig from "eslint-config-executable-stories";
import jestExecutableStories from "eslint-plugin-jest-executable-stories";

export default [
  ...baseConfig,
  {
    languageOptions: {
      globals: { process: "readonly" },
    },
  },
  {
    plugins: {
      "jest-executable-stories": jestExecutableStories,
    },
    rules: {
      ...jestExecutableStories.configs.recommended[0].rules,
    },
  },
];
