import baseConfig from "eslint-config-executable-stories";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  ...baseConfig,
  {
    ignores: ["dist/**", "storybook-static/**", "**/*.css", "test/**"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
