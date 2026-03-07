import baseConfig from "eslint-config-executable-stories";

export default [
  ...baseConfig,
  {
    ignores: ["dist/**", "bin/**", "*.story.docs.md"],
  },
];
