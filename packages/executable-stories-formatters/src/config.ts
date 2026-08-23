import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ExecutableStoriesConfig } from "./types/formatter.js";

/**
 * Config filenames auto-discovered when `--config` is not passed. `.mjs` is the
 * Astro scaffold's marker; `.js` is kept for back-compat. Both are valid ESM
 * here. If both exist in the same directory we refuse to guess which one wins
 * (see below) rather than silently shadowing one — so order is not significant.
 *
 * `.json` exists for the CLI's non-JS audience. The Go, Ruby, Rust, pytest,
 * JUnit 5, and xUnit adapters all emit the same raw run and reach the same
 * prebuilt binary, so a Ruby team configuring `sync` should not have to author
 * an ESM module with a default export to do it. JSON carries `sync` (plain
 * data) but not `formatters` (functions), which is exactly the split those
 * teams need.
 */
const CONFIG_CANDIDATES = [
  "executable-stories.config.mjs",
  "executable-stories.config.js",
  "executable-stories.config.json",
];

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

  // JSON is read rather than imported: an import attribute (`with { type:
  // "json" }`) does not survive the tsup bundle, and the CLI also ships as a Bun
  // single binary where a runtime JSON import is not resolvable either.
  const isJson = resolved.endsWith(".json");
  let config: unknown;
  if (isJson) {
    try {
      config = JSON.parse(readFileSync(resolved, "utf8"));
    } catch (err) {
      throw new Error(`Config file at ${resolved} is not valid JSON: ${(err as Error).message}`, {
        cause: err,
      });
    }
  } else {
    // A config file is a path chosen at runtime, so there is no static import
    // to write: this is the one thing dynamic import is for.
    // eslint-disable-next-line no-restricted-syntax
    config = (await import(resolved)).default;
  }

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error(
      isJson
        ? `Config file at ${resolved} must contain a JSON object. Got: ${Array.isArray(config) ? "array" : typeof config}`
        : `Config file at ${resolved} must export a default object. Got: ${typeof config}`,
    );
  }

  // `executable-stories.config.mjs` is ALSO the docs-site config (the init-astro
  // scaffold; drives the Astro loaders, not the CLI). The CLI's contract is
  // exactly `formatters` and `sync`, so project those keys out instead of
  // returning the whole module: a site config (source/sources, neither key)
  // then naturally contributes nothing, with no shape-sniffing needed.
  const { formatters, sync } = config as ExecutableStoriesConfig;
  return {
    ...(formatters === undefined ? {} : { formatters }),
    ...(sync === undefined ? {} : { sync }),
  };
}
