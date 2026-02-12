import baseConfig from "eslint-config-executable-stories";

export default [
  ...baseConfig,
  {
    ignores: ["dist/**", "*.story.docs.md"],
  },
];
