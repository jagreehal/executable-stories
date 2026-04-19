import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ExecutableStoriesConfig } from "./types/formatter.js";

export async function loadConfig(configPath?: string): Promise<ExecutableStoriesConfig> {
  const resolved = configPath
    ? resolve(configPath)
    : resolve(process.cwd(), "executable-stories.config.js");

  if (!existsSync(resolved)) return {};

  const mod = await import(resolved);
  const config = mod.default;

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error(
      `Config file at ${resolved} must export a default object. Got: ${typeof config}`
    );
  }

  return config as ExecutableStoriesConfig;
}
