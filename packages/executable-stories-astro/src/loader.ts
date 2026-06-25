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
export function storiesLoader(options: ExecutableStoriesConfig): StoriesLoader {
  const sources = resolveSources(options).map((s) => ({ ...s, abs: path.resolve(s.source) }));

  const sampleAbs = options.sampleSource ? path.resolve(options.sampleSource) : undefined;

  function sync(ctx: LoaderContext): void {
    ctx.store.clear();
    let total = 0;
    // Shared across sources so identical titles in different suites get distinct URL slugs.
    const slugSeen = new Map<string, number>();
    for (const src of sources) {
      const raw = readSource(src.abs, ctx);
      if (raw == null) continue;
      const entries = buildStoryEntries(raw, options, src, slugSeen);
      for (const entry of entries) {
        ctx.store.set({ id: entry.entryId, data: entry as unknown as Record<string, unknown> });
      }
      total += entries.length;
    }

    // First-run fallback: no real run JSON resolved yet, so populate the site
    // from the bundled sample (Storybook-style example content) rather than an
    // empty shell. Every entry is flagged `sample` so the views can say so. The
    // moment a real run lands, the watcher re-syncs and the sample disappears.
    if (total === 0 && sampleAbs) {
      const raw = readSource(sampleAbs, ctx);
      if (raw != null) {
        const entries = buildStoryEntries(raw, options, undefined, slugSeen);
        for (const entry of entries) {
          const flagged = { ...entry, sample: true };
          ctx.store.set({ id: entry.entryId, data: flagged as unknown as Record<string, unknown> });
        }
        ctx.logger.info(
          `[executable-stories] no run JSON found yet — showing ${entries.length} sample scenarios (run your tests to replace them)`,
        );
        watchAll(ctx, [sampleAbs], () => sync(ctx));
        return;
      }
    }

    const suffix = sources.length > 1 ? ` across ${sources.length} sources` : "";
    ctx.logger.info(`[executable-stories] loaded ${total} scenarios${suffix}`);
  }

  return {
    name: "executable-stories",
    load: async (ctx: LoaderContext) => {
      sync(ctx);
      watchAll(ctx, sources.map((s) => s.abs), () => {
        ctx.logger.info("[executable-stories] run JSON changed -> resync");
        sync(ctx);
      });
    },
  };
}
