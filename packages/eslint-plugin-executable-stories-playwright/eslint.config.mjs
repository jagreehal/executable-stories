import rootConfig from "../../eslint.config.mjs";

export default [
  ...rootConfig,
  {
    ignores: ["dist/**", "bin/**"],
  },
  {
    files: ["tests/**"],
    rules: { "no-restricted-imports": "off" },
  },
];
