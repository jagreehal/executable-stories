import { spawnSync } from "node:child_process";
import { platform } from "node:os";

type EnvOverrides = Record<string, string | undefined>;

export function runJest(configPath: string, envOverrides: EnvOverrides = {}) {
  const jestCommand = platform() === "win32" ? "jest.cmd" : "jest";
  const args = ["--config", configPath, "--runInBand"];
  const env = { ...process.env, ...envOverrides };

  const result = spawnSync(jestCommand, args, {
    env,
    stdio: "pipe",
    encoding: "utf8",
  });

  return {
    status: result.status ?? 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}
