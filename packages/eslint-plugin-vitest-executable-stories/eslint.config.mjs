import rootConfig from "../../eslint.config.mjs";

export default [
  ...rootConfig,
  {
    ignores: ["dist/**"],
  },
  {
    files: ["tests/**"],
    rules: { "no-restricted-imports": "off" },
  },
];
