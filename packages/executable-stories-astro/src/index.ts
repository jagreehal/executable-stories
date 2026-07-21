/**
 * executable-stories-astro — make Astro a first-class way to view living docs.
 *
 * Two pieces:
 *  - `storiesLoader` (also at the `/loader` subpath): an Astro Content Layer
 *    loader. Put it in your `src/content.config.ts`. This is the keystone —
 *    it turns the test run JSON into a hot-reloading `stories` collection.
 *  - `executableStories()`: an Astro integration for project-level wiring
 *    (options surface today; route injection + theme in a later phase).
 */
import fs from "node:fs";
import path from "node:path";

import type { AstroIntegration } from "astro";

import { storiesLoader } from "./loader.js";
import { resolveThemeCss } from "./theme.js";
import {
  resolveSources,
  type ExecutableStoriesConfig,
  type AuthoredDocsSource,
} from "./config.js";
import { assertRouteBases, resolveViews, type ResolvedPersonaView } from "./views.js";
import { joinHref, normalizeBase, storyNavItems, type SidebarEntry } from "./sidebar-nav.js";
import { navManifestPath, syncNavManifest, toRootPath } from "./nav-manifest.js";

export {
  storiesLoader,
  trajectoryLoader,
  buildStoryEntries,
  toRunResult,
  groupScenarios,
  countByStatus,
  storyEntries,
  type StoriesLoaderOptions,
  type StoriesLoader,
  type StoryEntryData,
  type StoryCollectionEntry,
  type ScenarioGroup,
  type StatusCounts,
} from "./loader.js";

// The unified config surface — one object drives the whole site.
export {
  defineExecutableStories,
  resolveSources,
  passesFilter,
  slugify,
  type ExecutableStoriesConfig,
  type StorySource,
  type ResolvedSource,
  type StoryFilter,
  type AuthoredDocsSource,
  type StoryTheme,
  type ThemePreset,
  type ThemeToken,
  type GroupBy,
} from "./config.js";

// Theme resolution (preset + accent + tokens -> :root CSS).
export { resolveThemeCss } from "./theme.js";

// Persona views — audience lenses (/for/product, /for/design, ...) over the
// same collection. Pure resolution + report derivation; routes stay thin.
export { assertRouteBases, resolveViews, matchView, viewReport, type ResolvedPersonaView } from "./views.js";
export type { PersonaView } from "./config.js";

// Journeys — ordered multi-scenario walkthroughs from journey:<id>[:<n>] tags.
// Pure derivation lives in core; re-exported so the injected routes and
// <StoryJourney/> resolve journeys from the same function.
export { extractJourneys, parseJourneyTag, type Journey } from "executable-stories-core";

// UI-state catalog — the /states thumbnail grid from state:<name> tags.
export { extractStates, parseStateTag, stateThumbnail, viewportOf, type UiState } from "./states.js";

// Authored-docs import (external folders, auto-titled) + markdown link rewriting.
export { authoredDocsLoader } from "./authored-docs-loader.js";
export { mdLinkRewrite, type MdLinkRewriteOptions } from "./md-link-rewrite.js";

// Explainer freshness (explain-change skill provenance blocks → banner + deep links).
export {
  auditExplainerFrontmatter,
  explainerBannerHtml,
  type ExplainerAudit,
  type ExplainerScenarioLine,
} from "./explainer-status.js";

// Trajectory types live in core (the pure session-fold primitive).
export {
  advanceState,
  initialRunState,
  summarizeRun,
  trajectorySummary,
  type RunState,
  type RunSummaryCounts,
  type TrajectoryDelta,
  type TrajectorySummary,
} from "executable-stories-core";

export { escapeHtml } from "./escape-html.js";

// Sidebar nav building blocks + href helpers (extracted; same public surface).
export {
  joinHref,
  normalizeBase,
  loadStoryReports,
  storyNavItems,
  type SidebarEntry,
  type SidebarItem,
} from "./sidebar-nav.js";

// Nav manifest — the watched file that keeps the sidebar fresh in dev.
export { navFingerprint, navManifestPath, syncNavManifest, toRootPath } from "./nav-manifest.js";

// Markdown projections behind the agent endpoints (/llms.txt, <slug>.md).
export { scenarioToMarkdown, storiesLlmsTxt } from "./scenario-markdown.js";
// Rebuild a full StoryReport from the flat `stories` collection so the index
// can render the SAME React <Report/> tree as the standalone single-file HTML.
export { storyReportFromEntries } from "./story-report-from-entries.js";

// Living-documentation: verify docs against stories, and summarise run health.
export {
  resolveVerification,
  presentStatus,
  verificationAgeDays,
  isVerificationStale,
  flattenReport,
  findScenarioById,
  hasScenarioId,
  reportFromStoryEntries,
  type VerificationStatus,
  type VerificationResult,
  type ScenarioLike,
  type StoryReportLike,
  type StatusPresentation,
} from "./verification.js";
export { summarizeHealth, type HealthSummary, type FailingScenario } from "./report-health.js";

/** Minimal logger surface (a subset of Astro's integration logger). */
interface PreflightLogger {
  info(message: string): void;
  warn(message: string): void;
}

/** Human "12s ago" / "3m ago" / "2h ago" / "5d ago" for a past timestamp. */
export function timeAgo(thenMs: number, nowMs: number): string {
  const s = Math.max(0, Math.round((nowMs - thenMs) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/**
 * Startup diagnostic: stat each run-JSON source and print one clear status line
 * — the terminal companion to the empty-state panel. When nothing exists yet it
 * pre-empts Astro's "collection is empty" notice, which reads like a config
 * error but is expected before the first test run.
 */
export function preflightSources(sources: string[], logger: PreflightLogger, nowMs: number): void {
  const checked = sources.map((src) => {
    try {
      return { src, exists: true, mtimeMs: fs.statSync(path.resolve(src)).mtimeMs };
    } catch {
      return { src, exists: false, mtimeMs: 0 };
    }
  });
  const present = checked.filter((c) => c.exists);
  if (present.length === sources.length && present.length > 0) {
    logger.info(
      `watching ${present.length} run JSON source(s): ` +
        present.map((c) => `${c.src} (updated ${timeAgo(c.mtimeMs, nowMs)})`).join(", ") +
        " — re-run your tests to hot-reload the pages.",
    );
    return;
  }
  const missing = checked.filter((c) => !c.exists).map((c) => c.src);
  logger.warn(
    `no run JSON yet at: ${missing.join(", ")}.\n` +
      "  The story pages show a getting-started panel until your tests write it.\n" +
      "  Fix: set rawRunPath in your StoryReporter to that path, then run your tests (watch mode for live reload).\n" +
      "  (You may see Astro note the collection is empty below — that's expected before the first run, not a config error.)",
  );
}

/** Values surfaced to the injected route pages via the virtual config module. */
interface RouteConfig {
  collection: string;
  sources: string[];
  routeBase: string;
  explorerBase: string;
  groupBy: string;
  themeCss: string;
  views: ResolvedPersonaView[];
  journeysBase: string;
  statesBase: string;
}

/**
 * Vite plugin that serves the resolved route config as the virtual module
 * `virtual:executable-stories/config`. The injected route pages import it so
 * customised `collection`/`routeBase`/`explorerBase`, the `groupBy`
 * categorisation, and the resolved theme CSS are honoured without hard-coding.
 */
function virtualConfigPlugin(config: RouteConfig) {
  const resolvedId = `\0${VIRTUAL_CONFIG_ID}`;
  return {
    name: "executable-stories:virtual-config",
    resolveId(id: string) {
      return id === VIRTUAL_CONFIG_ID ? resolvedId : null;
    },
    load(id: string) {
      if (id !== resolvedId) return null;
      return (
        `export const collection = ${JSON.stringify(config.collection)};\n` +
        `export const sources = ${JSON.stringify(config.sources)};\n` +
        `export const routeBase = ${JSON.stringify(config.routeBase)};\n` +
        `export const explorerBase = ${JSON.stringify(config.explorerBase)};\n` +
        `export const groupBy = ${JSON.stringify(config.groupBy)};\n` +
        `export const themeCss = ${JSON.stringify(config.themeCss)};\n` +
        `export const views = ${JSON.stringify(config.views)};\n` +
        `export const journeysBase = ${JSON.stringify(config.journeysBase)};\n` +
        `export const statesBase = ${JSON.stringify(config.statesBase)};\n`
      );
    },
  };
}

/**
 * Options for {@link executableStories}. This is the full shared config — the
 * integration uses the route/grouping/theme fields, the loader uses the
 * source/selection fields, so you can pass the SAME object to both.
 */
export type ExecutableStoriesOptions = ExecutableStoriesConfig;

/** Virtual module id the injected route pages import resolved bases from. */
const VIRTUAL_CONFIG_ID = "virtual:executable-stories/config";

/**
 * Everything the report island pulls in on first hydration. Pre-bundled in ONE
 * optimize pass at dev-server startup so Vite never re-optimizes mid-render
 * when the island hydrates — that re-optimize drops `react-dom/client`'s
 * `createRoot` export and 504s the page ("Outdated Optimize Dep"), leaving the
 * island unhydrated. Injected from the integration (not the scaffolded
 * astro.config) so the fix ships with `pnpm update executable-stories-astro`.
 */
const REPORT_ISLAND_DEPS = [
  "react",
  "react-dom",
  "react-dom/client",
  "react/jsx-runtime",
  "executable-stories-react",
  "executable-stories-react/interactive",
];

/**
 * Astro integration. Injects a stories index (`/stories`) and a story-detail
 * route (`/stories/<slug>`) that render scenarios from the `stories` collection
 * via the shipped render-doc-entry. The loader is wired separately in
 * `src/content.config.ts` via {@link storiesLoader} (so the collection schema
 * stays user-visible).
 */
export function executableStories(options: ExecutableStoriesOptions): AstroIntegration {
  const collection = options.collection ?? "stories";
  const routeBase = normalizeBase(options.routeBase ?? "/stories");
  const explorerBase = normalizeBase(options.explorerBase ?? "/explorer");
  const groupBy = options.groupBy ?? "feature";
  const themeCss = resolveThemeCss(options.theme);
  const injectStoryRoute = options.injectStoryRoute ?? true;
  const injectExplorer = options.injectExplorer ?? true;
  // Fail fast on a misconfigured source rather than rendering an empty site.
  // The resolved source paths are surfaced to the pages so the empty state can
  // tell a first-run user exactly which file the loader is waiting on.
  const sources = resolveSources(options).map((s) => s.source);
  const journeysBase = normalizeBase(options.journeysBase ?? "/journeys");
  const injectJourneys = options.injectJourneys ?? true;
  const statesBase = normalizeBase(options.statesBase ?? "/states");
  const injectStates = options.injectStates ?? true;
  // Fail fast on base misconfiguration: enabled built-in routes colliding
  // with each other, then views colliding with routes or each other.
  assertRouteBases(options);
  const views = resolveViews(options);
  return {
    name: "executable-stories",
    hooks: {
      "astro:config:setup": ({ injectRoute, updateConfig, addWatchFile, logger, config }) => {
        logger.info(`"${collection}" collection -> add storiesLoader to src/content.config.ts`);
        // Startup status for the run JSON, so the terminal is as clear as the UI.
        preflightSources(sources, logger, Date.now());
        // Expose the resolved config to the injected route pages so their links,
        // grouping, and accent honour the config instead of hard-coding values.
        // Also pre-bundle the report island's dependency subtree (see
        // REPORT_ISLAND_DEPS) and dedupe React so hooks/context work across the
        // island boundary — Astro deep-merges this with the user's own vite
        // config, so their `optimizeDeps.include` entries survive.
        updateConfig({
          vite: {
            plugins: [virtualConfigPlugin({ collection, sources, routeBase, explorerBase, groupBy, themeCss, views, journeysBase, statesBase })],
            optimizeDeps: { include: REPORT_ISLAND_DEPS },
            resolve: { dedupe: ["react", "react-dom"] },
          },
        });
        // Keep the sidebar fresh: the nav tree is computed at config load
        // (storiesSidebar), so a test run that adds/renames/removes scenarios
        // would leave the sidebar stale while the pages hot-reload. The loader
        // rewrites this manifest when a resync changes the nav tree; watching
        // it makes Astro restart the dev server — sidebar rebuilt. Unchanged
        // trees never write, so the red/green loop stays restart-free.
        if (config?.root) {
          try {
            const root = toRootPath(config.root as URL | string);
            syncNavManifest(root, options);
            addWatchFile?.(navManifestPath(root));
          } catch {
            // Nav freshness is best-effort; never break config load over it.
          }
        }
        // The story pages render the React report components (`<ReportScenario/>`
        // statically, the index as an interactive `<ReportInteractive/>` island),
        // so the site needs a React renderer registered. We don't auto-add it —
        // registering a renderer from inside another integration's config:setup
        // leaves @astrojs/react's client entry unbuilt on Astro 7. Detect it and
        // warn with the one-line fix instead (Astro's official pattern: the
        // consumer adds `react()` to their integrations).
        const hasReact = (config.integrations ?? []).some((i) => i?.name === "@astrojs/react");
        if (!hasReact) {
          logger.warn(
            "no React renderer detected — the story pages render React report components.\n" +
              "  Fix: `pnpm add @astrojs/react react react-dom`, then add `react()` to your\n" +
              "  astro.config integrations (before starlight()). Without it the build will fail\n" +
              "  to render the <ReportScenario/> / <ReportInteractive/> islands.",
          );
        }
        // Render the routes INSIDE the Starlight shell (sidebar/search/theme)
        // when the site uses Starlight; otherwise keep the standalone pages.
        // Auto-detect by inspecting the Astro integrations, with a `shell`
        // override. We never take a hard dependency on Starlight — the
        // starlight/* route files are only injected when it is present.
        const shellMode = options.shell ?? "auto";
        const hasStarlight = (config.integrations ?? []).some((i) => i?.name === "@astrojs/starlight");
        const useStarlight = shellMode === "starlight" || (shellMode === "auto" && hasStarlight);
        const variant = useStarlight ? "starlight/" : "";
        logger.info(
          useStarlight
            ? `rendering routes inside the Starlight shell (shell="${shellMode}")`
            : `rendering standalone route pages (shell="${shellMode}")`,
        );
        if (injectStoryRoute) {
          // Index page at the route base so the "Stories" nav link and the
          // story page's "All stories" back link resolve to a real page.
          injectRoute({
            pattern: routeBase,
            entrypoint: `executable-stories-astro/routes/${variant}stories.astro`,
          });
          // Detail route uses a single [slug] segment (slugs never contain "/"),
          // so it does not collide with the index route above the way a rest
          // param ([...slug], which also matches the empty base) would.
          injectRoute({
            pattern: joinHref(routeBase, "[slug]"),
            entrypoint: `executable-stories-astro/routes/${variant}story.astro`,
          });
          logger.info(`stories index mounted at ${routeBase}; detail at ${routeBase}/<slug>`);
          // Agent-readable twins: every story page gets a plain-Markdown
          // endpoint, and /llms.txt indexes them — the published site is
          // consumable by curl/LLMs, not just browsers. Endpoints render from
          // the same collection entries as the HTML routes, so they can't
          // drift. (Astro gives project-defined routes priority over injected
          // ones, so a user's own /llms.txt wins if they have one.)
          if (options.agentEndpoints ?? true) {
            injectRoute({
              pattern: joinHref(routeBase, "[slug].md"),
              entrypoint: "executable-stories-astro/routes/story-md.ts",
            });
            injectRoute({
              pattern: "/llms.txt",
              entrypoint: "executable-stories-astro/routes/llms-txt.ts",
            });
            logger.info(`agent endpoints mounted: /llms.txt + ${routeBase}/<slug>.md`);
          }
        }
        if (injectExplorer) {
          injectRoute({ pattern: explorerBase, entrypoint: `executable-stories-astro/routes/${variant}explorer.astro` });
          logger.info(`scenario explorer mounted at ${explorerBase}`);
        }
        // Journeys: ordered multi-scenario walkthroughs derived from the
        // journey:<id>[:<n>] tag convention. Index + one page per journey; the
        // index explains the convention when nothing is tagged yet.
        if (injectJourneys) {
          injectRoute({ pattern: journeysBase, entrypoint: `executable-stories-astro/routes/${variant}journeys.astro` });
          injectRoute({
            pattern: joinHref(journeysBase, "[slug]"),
            entrypoint: `executable-stories-astro/routes/${variant}journey.astro`,
          });
          logger.info(`journeys mounted at ${journeysBase}; detail at ${journeysBase}/<id>`);
        }
        // UI-state catalog: a thumbnail grid of state:<name>-tagged scenarios.
        if (injectStates) {
          injectRoute({ pattern: statesBase, entrypoint: `executable-stories-astro/routes/${variant}states.astro` });
          logger.info(`UI-state catalog mounted at ${statesBase}`);
        }
        // Persona views: one filtered/re-grouped index per audience lens. All
        // views share one route entrypoint — the page resolves which view it
        // is from the request pathname via the virtual config.
        for (const view of views) {
          injectRoute({ pattern: view.base, entrypoint: `executable-stories-astro/routes/${variant}view.astro` });
        }
        if (views.length > 0) {
          logger.info(`persona views mounted: ${views.map((v) => `${v.label} at ${v.base}`).join(", ")}`);
        }
      },
      // Type the virtual config module for consumers running `astro check`.
      "astro:config:done": ({ injectTypes }) => {
        injectTypes({
          filename: "config.d.ts",
          content:
            `declare module "${VIRTUAL_CONFIG_ID}" {\n` +
            "  export const collection: string;\n" +
            "  export const sources: string[];\n" +
            "  export const routeBase: string;\n" +
            "  export const explorerBase: string;\n" +
            "  export const groupBy: string;\n" +
            "  export const themeCss: string;\n" +
            "  export const views: import(\"executable-stories-astro\").ResolvedPersonaView[];\n" +
            "  export const journeysBase: string;\n" +
            "  export const statesBase: string;\n" +
            "}\n",
        });
      },
    },
  };
}

/** Convenience: build a loader from the same options object. */
export function createStoriesLoader(options: ExecutableStoriesOptions) {
  return storiesLoader(options);
}

/** Title-case a slug/segment for a default nav label ("deploy-runbooks" -> "Deploy Runbooks"). */
function titleCase(value: string): string {
  return value
    .replace(/^\/+|\/+$/g, "")
    .split(/[\s/_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Build Starlight sidebar entries straight from the config — no hand-wiring.
 * Spread the result into your Starlight `sidebar`:
 *
 *   starlight({ sidebar: [{ label: "Home", slug: "index" }, ...storiesSidebar(config)] })
 *
 * Emits a "Stories" link (route base), an "Explorer" link, and an autogenerated
 * group per `docs` source (so authored docs show up without manual nav edits).
 * Pass `{ stories: false }` / `{ explorer: false }` to omit those links.
 */
export function storiesSidebar(
  config: ExecutableStoriesConfig,
  opts: { stories?: boolean; explorer?: boolean } = {},
): SidebarEntry[] {
  const routeBase = normalizeBase(config.routeBase ?? "/stories");
  const explorerBase = normalizeBase(config.explorerBase ?? "/explorer");
  const entries: SidebarEntry[] = [];
  if (opts.stories !== false && (config.injectStoryRoute ?? true)) {
    // Fold the feature/scenario tree into the sidebar so the docs site has ONE
    // nav rail — the report drops its own in-content TOC when embedded
    // (StoriesIndexView passes hideToc). Falls back to a plain link when no run
    // JSON is readable yet (first run before tests emit results).
    const nav = storyNavItems(config);
    if (nav.length > 0) {
      entries.push({
        label: "Stories",
        collapsed: false,
        items: [{ label: "All scenarios", link: joinHref(routeBase) }, ...nav],
      });
    } else {
      entries.push({ label: "Stories", link: joinHref(routeBase) });
    }
  }
  if (opts.explorer !== false && (config.injectExplorer ?? true)) {
    entries.push({ label: "Explorer", link: joinHref(explorerBase) });
  }
  if (config.injectJourneys ?? true) {
    entries.push({ label: "Journeys", link: joinHref(normalizeBase(config.journeysBase ?? "/journeys")) });
  }
  if (config.injectStates ?? true) {
    entries.push({ label: "States", link: joinHref(normalizeBase(config.statesBase ?? "/states")) });
  }
  // Persona views: one nav link per audience lens, grouped so the rail reads
  // "For: Product / Design / Support" rather than a flat pile of links.
  const views = resolveViews(config);
  if (views.length > 0) {
    entries.push({
      label: "Audiences",
      collapsed: false,
      items: views.map((v) => ({ label: v.label, link: joinHref(v.base) })),
    });
  }
  for (const doc of config.docs ?? []) {
    const directory = docDirectory(doc);
    entries.push({
      label: doc.label ?? titleCase(doc.base ?? directory),
      items: [{ autogenerate: { directory } }],
    });
  }
  return entries;
}

/** The Starlight-relative directory an authored-docs source lives under. */
function docDirectory(doc: AuthoredDocsSource): string {
  if (doc.base) return normalizeBase(doc.base).replace(/^\//, "");
  // Fall back to the last path segment of the source folder.
  const seg = doc.path.replace(/[/\\]+$/, "").split(/[/\\]/).pop() ?? "docs";
  return seg;
}

export default executableStories;
