/**
 * Format presets — names for the three format combinations people actually
 * want, so nobody has to know which of thirteen formats their use case needs.
 *
 * A preset expands into the same `--format` list you could type by hand; it is
 * pure alias expansion, with no behaviour of its own. Passing both `--preset`
 * and `--format` unions them (the preset is a starting point, not a lock).
 */

/** The named format bundles. */
export const FORMAT_PRESETS = {
  /** Everything an agent reads: the report contract, the index, the manifest, the paste-into-an-LLM text. */
  agent: ["story-report-json", "scenario-index-json", "behavior-manifest-json", "agent-text"],
  /** What CI needs: a JUnit file for the test UI, plus the machine contract. */
  ci: ["junit", "story-report-json"],
  /** Human-facing docs artifacts. */
  docs: ["html", "markdown"],
} as const satisfies Record<string, readonly string[]>;

export type PresetName = keyof typeof FORMAT_PRESETS;

export const PRESET_NAMES = Object.keys(FORMAT_PRESETS) as PresetName[];

/** One line per preset, for `--help`. */
export function presetHelpLines(): string[] {
  return PRESET_NAMES.map((name) => `${name.padEnd(6)} ${FORMAT_PRESETS[name].join(", ")}`);
}

export interface PresetExpansion {
  /** The resolved format list (preset ∪ explicit), de-duplicated, order-stable. */
  formats: string[];
  /** Set when the name isn't a preset — the caller reports the usage error. */
  error?: string;
}

/**
 * Expand `--preset` into formats, unioned with any explicitly-requested ones.
 *
 * `explicitFormats` should be omitted (or the parser's default) when the user
 * didn't pass `--format`; pass `userSetFormat: false` so the default "html"
 * doesn't silently get added to every preset.
 */
export function expandPreset(
  preset: string | undefined,
  explicitFormats: string[],
  userSetFormat: boolean,
): PresetExpansion {
  if (!preset) return { formats: explicitFormats };
  if (!PRESET_NAMES.includes(preset as PresetName)) {
    return {
      formats: explicitFormats,
      error: `Unknown preset "${preset}". Valid presets: ${PRESET_NAMES.join(", ")}.`,
    };
  }
  const fromPreset = [...FORMAT_PRESETS[preset as PresetName]];
  // Union, preserving preset order first, then any extra explicit formats.
  const merged = userSetFormat ? [...fromPreset, ...explicitFormats] : fromPreset;
  return { formats: [...new Set(merged)] };
}
