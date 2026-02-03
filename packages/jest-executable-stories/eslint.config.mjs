import rootConfig from "../../eslint.config.mjs";

export default [
  ...rootConfig,
  {
    ignores: ["dist/**", "**/__tests__/**", "**/fixtures/**", ".jest-executable-stories/**", ".jest-story-docs/**"],
  },
];
