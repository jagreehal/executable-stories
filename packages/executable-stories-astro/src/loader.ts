/**
 * Astro Content Layer loader for executable-stories.
 *
 * Consumes the test run JSON the framework adapter writes (raw-run.json, or an
 * already-canonical TestRunResult) and feeds one in-memory entry per scenario
 * into Astro's content store. Watches the file(s) via the dev-server watcher so
 * a fresh test run hot-reloads the docs — no files are written to disk
 * (generated stories stay derived; tests remain the source of truth).
 *
 * Driven by the shared {@link ExecutableStoriesConfig}: a single `source`, many
 * named `sources`, plus `include`/`exclude` selection. Each entry is stamped
 * with its owning source so the site can group by suite.
 *
 * Verified mechanism (see .plans/hmr-spike-reference): registering the input
 * path on the LoaderContext watcher and re-populating the store on change
 * triggers Astro content-layer invalidation -> Vite HMR.
 */
import fs from "node:fs";
import path from "node:path";

import { type ReportScenario } from "executable-stories-core";

import {
  resolveSources,
  passesFilter,
  slugify,
  type ExecutableStoriesConfig,
  type ResolvedSource,
} from "./config.js";
import {
  readSource,
  toReport,
  watchAll,
  type LoaderContext,
  type StoriesLoader,
} from "./loader-context.js";
import { syncNavManifest, toRootPath } from "./nav-manifest.js";

// Re-export the shared loader plumbing + the split-out loaders/grouping so the
// package's `/loader` subpath stays a single import surface.
export { toRunResult, type LoaderContext, type StoriesLoader, type TransformOptions } from "./loader-context.js";
export { trajectoryLoader } from "./trajectory-loader.js";
export { groupScenarios, countByStatus, type ScenarioGroup, type StatusCounts } from "./grouping.js";

/** A single scenario entry as stored in the `stories` collection. */
export interface StoryEntryData extends ReportScenario {
  /**
   * Unique key for the content store. The canonical `scenario.id` strips the
   * source-file extension, so `.js`/`.ts` twins of the same test collide; the
   * store would silently overwrite one. `entryId` qualifies the scenario id
   * with the source name + (extension-bearing) source file, plus an ordinal for
   * any residual collision, so no scenario is dropped. `scenario.id` is
   * preserved in `id`.
   */
  entryId: string;
  /**
   * Short, human-readable URL slug derived from the scenario title (e.g.
   * `/stories/checkout-caps-the-discount-at-30-percent`). Disambiguated with a
   * numeric suffix only when two scenarios share a title. Distinct from
   * `entryId` (the collision-proof store key) and from `id` (the stable machine
   * key external tools resolve against) — this one is for the address bar.
   */
  slug: string;
  /** Owning feature, flattened onto the entry for grouping and nav. */
  feature: {
    id: string;
    title: string;
    sourceFile: string;
  };
  /** Which configured source (test suite) this scenario came from. */
  source: {
    name: string;
    label: string;
  };
  /** Run-level context, useful for headers/badges. */
  run: {
    runId: string;
    finishedAtMs: number;
    gitSha?: string;
  };
  /**
   * True when this entry came from the bundled `sampleSource` fallback (no real
   * run JSON was found yet). Lets the views show a "sample data" banner so the
   * populated first-run never masquerades as the user's own results.
   */
  sample?: boolean;
}

/**
 * Loader config. The loader uses the source/selection fields of the shared
 * {@link ExecutableStoriesConfig}; route/theme fields are ignored here (the
 * integration uses those), so you can pass the same object to both.
 */
export type StoriesLoaderOptions = ExecutableStoriesConfig;

/** The shape Astro's `getCollection("stories")` returns — an id + untyped data bag. */
export interface StoryCollectionEntry {
  id: string;
  data: Record<string, unknown>;
}

/**
 * Project the `stories` collection back onto the loader's real {@link StoryEntryData}
 * contract. Astro's content store is untyped (`data: Record<string, unknown>`),
 * so the cast is unavoidable — but it lives HERE, once, instead of being
 * sprinkled as `as any` across every route. Routes call:
 *
 *   const stories = storyEntries(await getCollection("stories"));
 */
export function storyEntries(collection: readonly StoryCollectionEntry[]): StoryEntryData[] {
  return collection.map((entry) => entry.data as unknown as StoryEntryData);
}

/**
 * Read + transform one run JSON into flat scenario entries, stamped with their
 * source and filtered by the config's include/exclude. `source` defaults to a
 * synthetic "default" source for single-source / test usage.
 */
export function buildStoryEntries(
  raw: unknown,
  options: ExecutableStoriesConfig,
  source?: ResolvedSource,
  /**
   * Tracks title-slug occurrences so URL slugs stay unique. Pass a shared map
   * across multiple `sources` so cross-suite title clashes also disambiguate;
   * defaults to a per-call map for standalone use.
   */
  slugSeen: Map<string, number> = new Map(),
): StoryEntryData[] {
  const src = source ?? {
    source: "",
    name: "default",
    label: "Stories",
    inputType: options.inputType ?? "raw",
    synthesize: options.synthesize ?? true,
  };
  const report = toReport(raw, { inputType: src.inputType, synthesize: src.synthesize });
  const entries: StoryEntryData[] = [];
  const seen = new Map<string, number>();
  for (const feature of report.features) {
    for (const scenario of feature.scenarios) {
      const featureRef = { title: feature.title, sourceFile: feature.sourceFile };
      if (!passesFilter({ status: scenario.status, tags: scenario.tags, feature: featureRef }, options)) {
        continue;
      }
      // Qualify with source name + source file (keeps .js/.ts twins and
      // cross-suite collisions distinct), then add an ordinal if even that
      // collides (same title twice in one file).
      const base = `${src.name}::${feature.sourceFile}#${scenario.id}`;
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      const entryId = n === 0 ? base : `${base}~${n}`;
      // Readable URL slug from the title; suffix only on a genuine title clash.
      const slugBase = slugify(scenario.title) || "scenario";
      const sn = slugSeen.get(slugBase) ?? 0;
      slugSeen.set(slugBase, sn + 1);
      const slug = sn === 0 ? slugBase : `${slugBase}-${sn + 1}`;
      entries.push({
        ...scenario,
        entryId,
        slug,
        feature: {
          id: feature.id,
          title: feature.title,
          sourceFile: feature.sourceFile,
        },
        source: { name: src.name, label: src.label },
        run: {
          runId: report.runId,
          finishedAtMs: report.finishedAtMs,
          gitSha: report.gitSha,
        },
      });
    }
  }
  return entries;
}

/**
 * Create the loader. Pass the shared config (single `source`, many `sources`,
 * plus `include`/`exclude`). Use it in `src/content.config.ts`:
 *
 *   import { defineCollection } from "astro:content";
 *   import { storiesLoader } from "executable-stories-astro/loader";
 *   export const collections = {
 *     stories: defineCollection({ loader: storiesLoader({ source: "reports/raw-run.json" }) }),
 *   };
 */
/**
 * Read every configured REAL source and flatten to entries — the single owner
 * of "config → entries with URL slugs". The slug map is shared across sources
 * so identical titles in different suites still get distinct slugs, exactly as
 * the story routes see them. Both the stories loader and the explainer
 * freshness audit go through here, so their views of ids/slugs cannot drift.
 *
 * `readRaw` supplies the file read (the loader logs unreadable sources; the
 * audit stays silent). `readableSources` distinguishes "no run JSON exists
 * yet" (0) from "runs exist but are empty" — an empty run is still evidence.
 *
 * A source may name a directory as well as a file. The formatter accumulates
 * runs as one JSON per source file, so pointing at that directory shows the
 * whole suite rather than only the files the last test run happened to touch.
 * The directory counts as one source: it is one suite, split across files.
 */
export function loadAllStoryEntries(
  options: ExecutableStoriesConfig,
  readRaw: (absPath: string, src: ResolvedSource) => unknown | null,
): { entries: StoryEntryData[]; readableSources: number } {
  const entries: StoryEntryData[] = [];
  const slugSeen = new Map<string, number>();
  let readableSources = 0;
  for (const src of resolveSources(options)) {
    let read = 0;
    const resolvedPath = path.resolve(src.source);
    const files = expandSource(resolvedPath);
    // A directory holds the per-file reports a test run writes, which are
    // canonical. Reading those as raw puts canonical statuses through raw
    // normalisation, where "passed" is not a known raw status and every passing
    // scenario silently becomes "skipped".
    const effective: ResolvedSource = {
      ...src,
      inputType: src.inputType ?? (isDirectory(resolvedPath) ? "canonical" : "raw"),
    };
    for (const abs of files) {
      const raw = readRaw(abs, effective);
      if (raw == null) continue;
      read++;
      entries.push(...buildStoryEntries(raw, options, effective, slugSeen));
    }
    if (read > 0) readableSources++;
  }
  return { entries, readableSources };
}

/**
 * The run files one source resolves to: the path itself, or every `.json` in it
 * when it names a directory. Sorted so entry order does not depend on the order
 * the filesystem happens to hand back.
 */
function isDirectory(absPath: string): boolean {
  try {
    return fs.statSync(absPath).isDirectory();
  } catch {
    return false;
  }
}

export function expandSource(absPath: string): string[] {
  let entries: string[];
  try {
    if (!fs.statSync(absPath).isDirectory()) return [absPath];
    entries = fs.readdirSync(absPath);
  } catch {
    // Missing or unreadable: hand back the path so the caller reports it the
    // same way it always has.
    return [absPath];
  }
  return entries
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => path.join(absPath, name));
}

export function storiesLoader(options: ExecutableStoriesConfig): StoriesLoader {
  const sourceAbsPaths = resolveSources(options).map((s) => path.resolve(s.source));

  const sampleAbs = options.sampleSource ? path.resolve(options.sampleSource) : undefined;

  function sync(ctx: LoaderContext): void {
    // Sidebar freshness (dev only): the nav tree is computed at astro.config
    // load, so when a test run changes it (scenario/feature added, renamed,
    // removed) the pages would hot-reload but the sidebar would go stale.
    // Rewriting the watched nav manifest makes Astro restart the dev server —
    // and only then; status-only changes leave the manifest untouched, keeping
    // the red/green loop pure HMR.
    if (ctx.watcher) {
      try {
        if (syncNavManifest(toRootPath(ctx.config?.root), options)) {
          ctx.logger.info("[executable-stories] nav tree changed -> refreshing sidebar (dev server restart)");
        }
      } catch {
        // Best-effort; a manifest write failure must never break a resync.
      }
    }
    ctx.store.clear();
    const { entries } = loadAllStoryEntries(options, (abs) => readSource(abs, ctx));
    for (const entry of entries) {
      ctx.store.set({ id: entry.entryId, data: entry as unknown as Record<string, unknown> });
    }
    const total = entries.length;

    // First-run fallback: no real run JSON resolved yet, so populate the site
    // from the bundled sample (Storybook-style example content) rather than an
    // empty shell. Every entry is flagged `sample` so the views can say so. The
    // moment a real run lands, the watcher re-syncs and the sample disappears.
    if (total === 0 && sampleAbs) {
      const raw = readSource(sampleAbs, ctx);
      if (raw != null) {
        const sampleEntries = buildStoryEntries(raw, options);
        for (const entry of sampleEntries) {
          const flagged = { ...entry, sample: true };
          ctx.store.set({ id: entry.entryId, data: flagged as unknown as Record<string, unknown> });
        }
        ctx.logger.info(
          `[executable-stories] no run JSON found yet — showing ${sampleEntries.length} sample scenarios (run your tests to replace them)`,
        );
        watchAll(ctx, [sampleAbs], () => sync(ctx));
        return;
      }
    }

    const suffix = sourceAbsPaths.length > 1 ? ` across ${sourceAbsPaths.length} sources` : "";
    ctx.logger.info(`[executable-stories] loaded ${total} scenarios${suffix}`);
  }

  return {
    name: "executable-stories",
    load: async (ctx: LoaderContext) => {
      sync(ctx);
      watchAll(ctx, sourceAbsPaths, () => {
        ctx.logger.info("[executable-stories] run JSON changed -> resync");
        sync(ctx);
      });
    },
  };
}
