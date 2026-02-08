import baseConfig from "eslint-config-executable-stories";

export default [
  ...baseConfig,
  {
    languageOptions: {
      globals: { process: "readonly" },
    },
  },
  {
    files: ["cypress/**/*.cy.ts", "cypress/**/*.ts"],
    rules: {
      "no-empty-pattern": "off",
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
];
