/**
 * The unified executable-stories config — one object that drives the whole site.
 *
 * Author it once (e.g. `executable-stories.config.ts`) and hand the SAME object
 * to both halves of the integration:
 *
 *   import { defineExecutableStories } from "executable-stories-astro";
 *   export default defineExecutableStories({
 *     sources: [
 *       { name: "cdk", label: "Infrastructure", source: "../apps/cdk/reports/raw-run.json" },
 *       { name: "cli", label: "CLI",            source: "../apps/cli/reports/raw-run.json" },
 *     ],
 *     include: { tags: ["security", "observability"] },
 *     groupBy: "tag",
 *     docs: [{ path: "../apps/cdk/docs", label: "Runbooks", base: "/runbooks" }],
 *   });
 *
 *   // astro.config.mjs   -> executableStories(config)
 *   // content.config.ts  -> storiesLoader(config)  + sidebar: storiesSidebar(config)
 *
 * Everything is optional except a source: pass `source` (one file) or `sources`
 * (many). The rest has sensible defaults so the simplest config is just
 * `{ source: "reports/raw-run.json" }`.
 */
import path from "node:path";

import type { TestStatus } from "executable-stories-core";

/** How scenarios are categorised in the stories index, explorer, and nav. */
export type GroupBy = "feature" | "tag" | "source" | "status" | "none";

/** One test-run input. Use several (via `sources`) to combine suites in one site. */
export interface StorySource {
  /** Path to the run JSON the adapter writes. Relative paths resolve from the Astro project root. */
  source: string;
  /** Stable key for this source (grouping + entry ids). Derived from the path when omitted. */
  name?: string;
  /** Human label shown when grouping by source. Defaults to `name`. */
  label?: string;
  /** "raw" (default) runs synthesize + canonicalize; "canonical" is a TestRunResult already. */
  inputType?: "raw" | "canonical";
  /** Synthesize story metadata for plain tests (raw input only). Default true. */
  synthesize?: boolean;
}

/** Select which scenarios appear. `include` is an allowlist; `exclude` runs after it. */
export interface StoryFilter {
  /** Keep only scenarios carrying at least one of these tags. */
  tags?: string[];
  /** Keep only scenarios with one of these statuses. */
  status?: TestStatus[];
  /** Keep only scenarios whose feature title or source file contains one of these substrings. */
  features?: string[];
}

/** A folder of hand-authored markdown/mdx to mount alongside the generated stories. */
export interface AuthoredDocsSource {
  /** Folder of `.md`/`.mdx` files. Relative paths resolve from the Astro project root. */
  path: string;
  /** Nav group label. Defaults to a title-cased folder name. */
  label?: string;
  /** URL base the docs mount under (used for sidebar links). Default derived from the folder name. */
  base?: string;
}

/** A built-in theme preset for the story pages. `default` inherits the host. */
export type ThemePreset = "default" | "terminal" | "minimal" | "vibrant";

/**
 * The themeable design tokens the story pages read (rendered as `--es-<name>`
 * CSS custom properties). `accent` colours links/headers; `pass`/`fail`/`warn`
 * colour the status pills and step borders; `fg`/`muted`/`border`/`surface`
 * are the text/chrome surfaces (these inherit Starlight's light/dark palette by
 * default, so override them only if you mean to).
 */
export type ThemeToken = "accent" | "fg" | "muted" | "border" | "surface" | "pass" | "fail" | "warn";

/** Theming knobs surfaced to the injected route pages. */
export interface StoryTheme {
  /** Accent colour for links/headers. Shorthand for `tokens.accent`. */
  accent?: string;
  /** A built-in palette. `tokens` and `accent` override individual values on top. */
  preset?: ThemePreset;
  /** Override any individual token (wins over `preset` and `accent`). */
  tokens?: Partial<Record<ThemeToken, string>>;
}

/** The whole-site config object. */
export interface ExecutableStoriesConfig {
  // ── Sources: what test output to include ──────────────────────
  /** A single run JSON (shorthand for `sources: [{ source }]`). */
  source?: string;
  /** Multiple named sources — combine several suites in one site. */
  sources?: StorySource[];
  /**
   * Fallback run JSON used only when no `source`/`sources` file resolves yet —
   * so a freshly-scaffolded site is populated with sample scenarios on first
   * run instead of an empty shell. Replaced automatically the moment a real run
   * lands; entries loaded from it are flagged `sample` so the views label them.
   */
  sampleSource?: string;
  /** Default inputType for sources that don't set their own. */
  inputType?: "raw" | "canonical";
  /** Default synthesize for sources that don't set their own. */
  synthesize?: boolean;

  // ── Selection: which scenarios to show ────────────────────────
  /** Allowlist filter. */
  include?: StoryFilter;
  /** Denylist filter, applied after `include`. */
  exclude?: StoryFilter;

  // ── Categorisation ────────────────────────────────────────────
  /** How the index/explorer/nav group scenarios. Default "feature". */
  groupBy?: GroupBy;

  // ── Authored docs ─────────────────────────────────────────────
  /** Existing markdown folders to mount as docs (auto-titled, links rewritten). */
  docs?: AuthoredDocsSource[];

  // ── Routes ────────────────────────────────────────────────────
  /** Collection name the loader feeds. Default "stories". */
  collection?: string;
  /** URL base the story pages mount under. Default "/stories". */
  routeBase?: string;
  /** URL base the Scenario Explorer mounts under. Default "/explorer". */
  explorerBase?: string;
  /** Inject the stories index + detail routes. Default true. */
  injectStoryRoute?: boolean;
  /** Inject the searchable Scenario Explorer. Default true. */
  injectExplorer?: boolean;
  /**
   * Where the injected routes render. Default `"auto"`: render INSIDE the
   * Starlight shell (sidebar, search, theme) when `@astrojs/starlight` is
   * detected in the Astro config, and standalone pages otherwise. Set
   * `"starlight"` or `"standalone"` to force one regardless of detection.
   * (No hard dependency on Starlight — the Starlight route variants are only
   * injected when Starlight is present.)
   */
  shell?: "auto" | "starlight" | "standalone";

  // ── Theme ─────────────────────────────────────────────────────
  /** Light theming for the standalone route pages. */
  theme?: StoryTheme;
}

/**
 * Identity helper that gives you full type-checking + inference on the config
 * object. Pure — it just returns what you pass, so the same object can feed the
 * integration, the loader, and the sidebar helper.
 */
export function defineExecutableStories<T extends ExecutableStoriesConfig>(config: T): T {
  return config;
}

/** A source with every field resolved (name/label filled in). */
export interface ResolvedSource extends Required<Omit<StorySource, "label">> {
  label: string;
}

/** A short, URL/identifier-safe slug. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const GENERIC_FILE = /^(raw-run|index|report|reports|test-results|results|run)$/;
const GENERIC_DIR = /^(reports|test-reports|dist|out|build|tmp|coverage)$/;

/** Derive a readable source name from its path when one isn't given. */
function deriveSourceName(source: string, index: number): string {
  const fallback = `source-${index + 1}`;
  const file = path.basename(source).replace(/\.[^.]+$/, "");
  if (!GENERIC_FILE.test(file)) return slugify(file) || fallback;
  // Generic filename (raw-run.json): walk up the directory chain to the first
  // meaningful (non-generic) ancestor — e.g. ".../cdk/test-reports/raw-run.json"
  // -> "cdk", skipping the generic "test-reports".
  const parts = path
    .dirname(source)
    .split(/[/\\]+/)
    .filter((p) => p && p !== "." && p !== "..");
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!GENERIC_DIR.test(parts[i]!)) return slugify(parts[i]!) || fallback;
  }
  return slugify(file) || fallback;
}

/**
 * Normalise `source`/`sources` into a fully-resolved list. Accepts the single
 * `source` shorthand, an array of `sources`, or both (merged). Always returns at
 * least the inputs the user gave; throws only if neither is present.
 */
export function resolveSources(config: ExecutableStoriesConfig): ResolvedSource[] {
  const raw: StorySource[] = [];
  if (config.source) raw.push({ source: config.source });
  if (config.sources) raw.push(...config.sources);
  if (raw.length === 0) {
    throw new Error(
      'executable-stories: no source configured. Set `source: "reports/raw-run.json"` or `sources: [...]`.',
    );
  }
  const usedNames = new Set<string>();
  return raw.map((s, i) => {
    let name = s.name ?? deriveSourceName(s.source, i);
    // Guarantee uniqueness if two sources derive the same name.
    if (usedNames.has(name)) {
      let n = 2;
      while (usedNames.has(`${name}-${n}`)) n++;
      name = `${name}-${n}`;
    }
    usedNames.add(name);
    return {
      source: s.source,
      name,
      label: s.label ?? name,
      inputType: s.inputType ?? config.inputType ?? "raw",
      synthesize: s.synthesize ?? config.synthesize ?? true,
    };
  });
}

/** Minimal scenario shape the filter inspects. */
export interface FilterableScenario {
  status: TestStatus;
  tags: string[];
  feature: { title: string; sourceFile: string };
}

function matchesOneFilter(s: FilterableScenario, f: StoryFilter): boolean {
  if (f.tags && !f.tags.some((t) => s.tags.includes(t))) return false;
  if (f.status && !f.status.includes(s.status)) return false;
  if (
    f.features &&
    !f.features.some(
      (needle) =>
        s.feature.title.toLowerCase().includes(needle.toLowerCase()) ||
        s.feature.sourceFile.toLowerCase().includes(needle.toLowerCase()),
    )
  ) {
    return false;
  }
  return true;
}

/** True if the scenario passes `include` (if any) and is not removed by `exclude`. */
export function passesFilter(
  s: FilterableScenario,
  config: Pick<ExecutableStoriesConfig, "include" | "exclude">,
): boolean {
  if (config.include && !matchesOneFilter(s, config.include)) return false;
  if (config.exclude && matchesOneFilter(s, config.exclude)) return false;
  return true;
}
