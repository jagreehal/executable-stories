import baseConfig from "eslint-config-executable-stories";

export default [
  ...baseConfig,
  {
    ignores: ["dist/**", "bin/**", "scripts/**", "*.story.docs.md"],
  },
];
