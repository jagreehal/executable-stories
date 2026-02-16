import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../../");
const rootEslintConfig = path.join(repoRoot, "eslint.config.mjs");
const vitestPkgEslintConfig = path.join(
  repoRoot,
  "packages/executable-stories-vitest/eslint.config.mjs",
);

describe("eslint config regressions", () => {
  it("allows dynamic import in vitest error-handling tests", async () => {
    const eslint = new ESLint({
      overrideConfigFile: rootEslintConfig,
      ignore: false,
    });

    const [result] = await eslint.lintText(
      "const mod = await import('node:fs'); void mod;",
      {
        filePath: path.join(
          repoRoot,
          "packages/executable-stories-vitest/src/__tests__/error-handling.test.ts",
        ),
      },
    );

    const dynamicImportErrors = result.messages.filter(
      (m) => m.ruleId === "no-restricted-syntax",
    );

    expect(dynamicImportErrors).toHaveLength(0);
  });

  it("allows dynamic import in vitest reporter implementation", async () => {
    const eslint = new ESLint({
      overrideConfigFile: vitestPkgEslintConfig,
      ignore: false,
    });

    const [result] = await eslint.lintText(
      "const maybe = await import('node:fs'); void maybe;",
      {
        filePath: path.join(
          repoRoot,
          "packages/executable-stories-vitest/src/reporter.ts",
        ),
      },
    );

    const dynamicImportErrors = result.messages.filter(
      (m) => m.ruleId === "no-restricted-syntax",
    );

    expect(dynamicImportErrors).toHaveLength(0);
  });
});
