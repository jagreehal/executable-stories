import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(testDir, "..");
const exampleJson = resolve(packageDir, "schemas/examples/minimal.json");

describe("packaged CLI", () => {
  it(
    "validates example input after build",
    () => {
      execFileSync("pnpm", ["build"], {
        cwd: packageDir,
        stdio: "pipe",
      });

      const output = execFileSync(
        "node",
        ["dist/cli.js", "validate", exampleJson],
        {
          cwd: packageDir,
          encoding: "utf8",
          stdio: "pipe",
        }
      );

      expect(output).toContain("Valid RawRun (schemaVersion 1).");
    },
    30_000
  );

  it(
    "rejects unsupported compare formats instead of silently ignoring them",
    () => {
      expect(() =>
        execFileSync(
          "pnpm",
          [
            "exec",
            "tsx",
            "src/cli.ts",
            "compare",
            exampleJson,
            exampleJson,
            "--format",
            "html,junit",
          ],
          {
            cwd: packageDir,
            encoding: "utf8",
            stdio: "pipe",
          }
        )
      ).toThrowError(/compare supports only "html" and "markdown" formats/);
    },
    30_000
  );
});
