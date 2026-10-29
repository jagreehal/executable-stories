import baseConfig from "eslint-config-executable-stories";

export default [
  ...baseConfig,
  {
    ignores: ["dist/**", "reporter.cjs"],
  },
  {
    // Chai assertions are property reads: expect(x).to.be.true
    files: ["cypress/**"],
    rules: { "@typescript-eslint/no-unused-expressions": "off" },
  },
  {
    // The story API reads Cypress globals at import, so tests set them up first and import after.
    files: ["src/__tests__/**"],
    rules: { "no-restricted-syntax": "off" },
  },
];
