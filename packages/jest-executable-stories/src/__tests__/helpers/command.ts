/**
 * Spawn vitest run with a given config path. Used by reporter integration tests
 * so we can run vitest with a fixture config and assert the generated report.
 * Same pattern as vitest-markdown-reporter: https://github.com/pecirep/vitest-markdown-reporter
 */
import { spawnSync } from "node:child_process";
import { platform } from "node:os";

export function runVitest(configPath: string, env?: Record<string, string | undefined>): ReturnType<typeof spawnSync> {
  const vitestCommand = platform() === "win32" ? "vitest.cmd" : "vitest";
  return spawnSync(
    vitestCommand,
    ["run", `--config=${configPath}`],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        ...env,
      },
    },
  );
}
