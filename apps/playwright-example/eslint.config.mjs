import baseConfig from "eslint-config-executable-stories";
import playwrightExecutableStories from "eslint-plugin-playwright-executable-stories";

export default [
  ...baseConfig,
  {
    languageOptions: {
      globals: { process: "readonly" },
    },
  },
  {
    plugins: {
      "playwright-executable-stories": playwrightExecutableStories,
    },
    rules: {
      ...playwrightExecutableStories.configs.recommended[0].rules,
    },
  },
];
