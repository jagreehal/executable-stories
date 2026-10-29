import baseConfig from "eslint-config-executable-stories";

export default [
  ...baseConfig,
  {
    ignores: ["dist/**"],
  },
  {
    // Playwright passes testInfo second, so a test that needs no fixtures writes ({}, testInfo).
    files: ["src/__tests__/**"],
    rules: { "no-empty-pattern": "off" },
  },
];
