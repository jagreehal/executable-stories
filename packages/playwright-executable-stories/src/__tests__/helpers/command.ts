/**
 * Spawn Playwright test run with a given config path. Used by reporter integration tests
 * so we can run Playwright with a fixture config and assert the generated report.
 */
import { spawnSync } from "node:child_process";

export function runPlaywright(
  configPath: string,
  env?: Record<string, string | undefined>,
): ReturnType<typeof spawnSync> {
  return spawnSync(
    "npx",
    ["playwright", "test", `--config=${configPath}`],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        ...env,
      },
    },
  );
}
