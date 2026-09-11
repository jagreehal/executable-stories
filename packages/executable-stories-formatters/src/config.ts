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
  const { formatters, sync, defaults } = config as ExecutableStoriesConfig;
  return {
    ...(formatters === undefined ? {} : { formatters }),
    ...(sync === undefined ? {} : { sync }),
    ...(defaults === undefined ? {} : { defaults }),
  };
}

/** What a parseArgs option accepts, as much of it as the defaults need. */
export interface CliOptionSpec {
  type: "string" | "boolean";
  multiple?: boolean;
}

/** A value the CLI's own parser could have produced for one flag. */
export type CliOptionValue = string | boolean | string[];

/**
 * Config-file `defaults` translated into parser values.
 *
 * Keyed by flag name because that is the vocabulary the tool already has:
 * `--html-title` in a CI script and `"html-title"` in the config file are the
 * same string, so there is no second set of names to keep in step.
 *
 * Pure — it reports what to apply and what is wrong; the CLI owns exiting.
 * The rules keep a mistyped config loud:
 * - a key the CLI has no flag for is an error;
 * - a value of the wrong type is an error, except that a string flag takes a
 *   number (`"html-stale-after-days": 14`), which is what anyone writes in JSON;
 * - `config` and `help` are refused: the first is already resolved by the time
 *   this file is read, and the second is not a setting.
 */
export function resolveConfigDefaults(args: {
  defaults: Record<string, unknown> | undefined;
  options: Record<string, CliOptionSpec>;
  /** Flags the user typed on the command line. Those always win. */
  typed: ReadonlySet<string>;
}): { values: Record<string, CliOptionValue>; errors: string[] } {
  const values: Record<string, CliOptionValue> = {};
  const errors: string[] = [];
  if (!args.defaults) return { values, errors };

  for (const [rawKey, rawValue] of Object.entries(args.defaults)) {
    // Forgiving about the dashes a reader copies out of `--help`.
    const key = rawKey.replace(/^--/, "");

    if (key === "config" || key === "help") {
      errors.push(`"${rawKey}" cannot be set in the config file's defaults.`);
      continue;
    }
    const spec = args.options[key];
    if (!spec) {
      errors.push(`"${rawKey}" in the config file's defaults is not a CLI option.`);
      continue;
    }
    if (args.typed.has(key)) continue; // the command line wins

    if (spec.multiple) {
      const list = Array.isArray(rawValue) ? rawValue : [rawValue];
      const bad = list.some((v) => typeof v !== "string" && typeof v !== "number");
      if (bad) {
        errors.push(`"${rawKey}" expects a string or a list of strings.`);
        continue;
      }
      values[key] = list.map((v) => String(v));
      continue;
    }

    if (spec.type === "boolean") {
      if (typeof rawValue !== "boolean") {
        errors.push(`"${rawKey}" expects true or false, got ${describe(rawValue)}.`);
        continue;
      }
      values[key] = rawValue;
      continue;
    }

    if (typeof rawValue === "string") {
      values[key] = rawValue;
    } else if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      values[key] = String(rawValue);
    } else {
      errors.push(`"${rawKey}" expects a string, got ${describe(rawValue)}.`);
    }
  }

  return { values, errors };
}

function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "a list";
  return typeof value;
}


/** The one flag pair with two spellings. Kept together so they cannot drift. */
const SYNTHESIZE = "synthesize-stories";
const NO_SYNTHESIZE = "no-synthesize-stories";

/**
 * Story synthesis as ONE setting, however it was spelled.
 *
 * `--synthesize-stories` and `--no-synthesize-stories` are two spellings of the
 * same boolean, so they are resolved in one place under the rule the rest of
 * the config defaults follow: what the user typed wins, and between two typed
 * spellings the last one does — the way a shell user expects an alias to be
 * overridden at the prompt.
 *
 * A config that sets both keys against each other is an error rather than a
 * coin flip.
 */
export function resolveSynthesizeStories(args: {
  /** Flag names the command line gave, in the order it gave them. */
  typed: readonly string[];
  /** `synthesize-stories`, from the command line or the config file. */
  positive: unknown;
  /** `no-synthesize-stories`, from the command line or the config file. */
  negative: unknown;
}): { value: boolean; errors: string[] } {
  for (let i = args.typed.length - 1; i >= 0; i--) {
    if (args.typed[i] === SYNTHESIZE) return { value: true, errors: [] };
    if (args.typed[i] === NO_SYNTHESIZE) return { value: false, errors: [] };
  }

  const fromPositive = typeof args.positive === "boolean" ? args.positive : undefined;
  const fromNegative = typeof args.negative === "boolean" ? !args.negative : undefined;
  if (
    fromPositive !== undefined &&
    fromNegative !== undefined &&
    fromPositive !== fromNegative
  ) {
    return {
      value: true,
      errors: [
        `"${SYNTHESIZE}" and "${NO_SYNTHESIZE}" contradict each other. They are one setting: keep whichever reads better and drop the other.`,
      ],
    };
  }

  // Synthesis is on unless something says otherwise: a plain test with no story
  // still belongs in the report by default.
  return { value: fromPositive ?? fromNegative ?? true, errors: [] };
}
