import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ExecutableStoriesConfig } from "./types/formatter.js";

/**
 * Config filenames auto-discovered when `--config` is not passed. `.mjs` is the
 * Astro scaffold's marker; `.js` is kept for back-compat. Both are valid ESM
 * here. If both exist in the same directory we refuse to guess which one wins
 * (see below) rather than silently shadowing one — so order is not significant.
 */
const CONFIG_CANDIDATES = ["executable-stories.config.mjs", "executable-stories.config.js"];

export async function loadConfig(configPath?: string): Promise<ExecutableStoriesConfig> {
  let resolved: string | undefined;
  if (configPath) {
    resolved = resolve(configPath);
  } else {
    // Auto-discovery: if more than one candidate is present in the cwd, picking
    // one silently would let a newly-scaffolded `.mjs` shadow an established
    // `.js` (or vice versa), loading a different config object with no warning.
    // Fail loudly and make the user disambiguate with `--config` instead.
    const present = CONFIG_CANDIDATES.map((name) => resolve(process.cwd(), name)).filter(existsSync);
    if (present.length > 1) {
      throw new Error(
        `Multiple config files found in this directory:\n` +
          present.map((p) => `  - ${p}`).join("\n") +
          `\nKeep only one, or pass --config <path> to choose which to load.`,
      );
    }
    resolved = present[0];
  }

  if (!resolved || !existsSync(resolved)) return {};

  const mod = await import(resolved);
  const config = mod.default;

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error(
      `Config file at ${resolved} must export a default object. Got: ${typeof config}`
    );
  }

  return config as ExecutableStoriesConfig;
}
