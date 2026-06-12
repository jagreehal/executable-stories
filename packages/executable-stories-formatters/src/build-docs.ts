/**
 * `executable-stories build-docs <raw-run.json>` — the whole living-docs
 * pipeline in one step.
 *
 * From a single raw run it generates the Scenario Explorer's data, the Astro
 * story pages (with their assets), bundles any media the Explorer references,
 * and — when an OpenAPI spec is supplied — the API coverage pages. Paths are
 * derived from the scaffolded site layout so there are no flags to get wrong.
 *
 * Kept out of cli.ts (which only parses args and calls `buildDocs`) so the
 * orchestration is testable in-process, mirroring import-openapi.ts.
 */

import * as fs from "node:fs";
import * as path from "node:path";

import { validateRawRun } from "./validation/schema-validator";
import { synthesizeStories } from "./converters/synthesize";
import { canonicalizeRun } from "./converters/acl";
import { assertValidRun } from "./converters/acl/validate";
// eslint-disable-next-line no-restricted-imports -- ReportGenerator currently lives in the package entrypoint (same as cli.ts).
import { ReportGenerator } from "./index.js";
import { importOpenApi } from "./import-openapi";
import { copyAsset } from "./bundler/copy-asset";
import { deriveAudience } from "./review/conventions";
import { buildScenarioLinks, scenarioAnchor, type ScenarioLinksIndex } from "./scenario-links";
import { diffStoryReports, type BehaviorDiff } from "./behavior-diff";
import { renderChangesPage } from "./changes-page";
import { renderOverviewPage } from "./overview-page";
import type { RawRun } from "./types/raw";
import type { ReviewAudience } from "./types/review";
import type { StoryReport } from "./types/story-report";
import type { TestCaseResult, TestRunResult } from "./types/test-result";

/** Top-level audiences, in nav order. Engineer first (internals), then stakeholder. */
export const AUDIENCES = ["engineer", "stakeholder"] as const;

/**
 * Split a run into per-audience sub-runs using the same convention-based
 * `deriveAudience` the review report uses (e2e/spec → stakeholder, else
 * engineer; `@audience:*` tag overrides). Each sub-run carries the full run
 * metadata so its generated pages still know the gitSha/CI/etc. Zero authoring
 * burden: nothing in the test API changes.
 */
export function partitionByAudience(
  run: TestRunResult,
): Record<ReviewAudience, TestRunResult> {
  const buckets: Record<ReviewAudience, TestCaseResult[]> = {
    engineer: [],
    stakeholder: [],
  };
  for (const tc of run.testCases) {
    buckets[deriveAudience(tc.sourceFile, tc.tags)].push(tc);
  }
  return {
    engineer: { ...run, testCases: buckets.engineer },
    stakeholder: { ...run, testCases: buckets.stakeholder },
  };
}

export interface BuildDocsOptions {
  /** Raw run (schemaVersion 1) produced by a framework's StoryReporter. */
  rawRunPath: string;
  /** Root of the scaffolded Astro site (from `init-astro`). */
  siteDir: string;
  /** Optional OpenAPI spec — generates API coverage pages when given. */
  openapiPath?: string;
  /** Synthesize missing story metadata (default true). */
  synthesizeStories?: boolean;
  /**
   * Group generated story pages by derived audience (engineer = unit/integration,
   * stakeholder = e2e) into `stories/<audience>/` subdirs, so the Starlight sidebar
   * reflects the split.
   *
   * **Default false** — opt-in, because enabling it changes every page URL from
   * `/stories/<file>/` to `/stories/<audience>/<file>/`, which would 404 existing
   * bookmarks and stored deep links on upgrade. The portal (action `mode: portal`)
   * turns this on deliberately; plain `build-docs` stays backward-compatible.
   */
  audienceSplit?: boolean;
  /**
   * Previous run's `story-report.json`. When supplied, build-docs computes a
   * scenario-level diff (added/removed/regressed/fixed) and emits a "What's
   * changed" page + `changes.json`, so the portal reads as living, not a snapshot.
   */
  baselinePath?: string;
}

export interface BuildDocsResult {
  siteDir: string;
  bundledAssets: number;
  apiPages: number;
  /** Scenario count per audience (0 means no pages were generated for it). */
  audiences: Record<ReviewAudience, number>;
  /** Number of scenarios written to the deep-link index. */
  scenarioLinks: number;
  /** Change summary vs the baseline (undefined when no baseline was supplied). */
  changes?: BehaviorDiff["summary"];
}

/** Why a build-docs run failed — lets the CLI pick the right exit code. */
export type BuildDocsErrorKind = "input" | "schema" | "generation";

export class BuildDocsError extends Error {
  constructor(
    message: string,
    readonly kind: BuildDocsErrorKind,
  ) {
    super(message);
    this.name = "BuildDocsError";
  }
}

const isRemote = (p: string): boolean => /^(?:https?:|data:)/i.test(p);

/**
 * Copy local screenshot/video files referenced by the story report into the
 * site's public assets dir and rewrite their paths to a served URL, so the
 * Scenario Explorer (which reads the JSON directly, unlike the Astro pages)
 * shows real media instead of broken links. Anything that resolves to a real
 * file on disk is bundled; remote URLs and already-served paths like
 * "/stories/assets/x" aren't files here, so they're left untouched.
 *
 * Returns the number of assets copied.
 */
export function bundleExplorerAssets(
  reportPath: string,
  assetsDir: string,
  baseUrl = "/stories/assets",
): number {
  if (!fs.existsSync(reportPath)) return 0;
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as {
    features?: Array<{ scenarios?: Array<{ docEntries?: unknown[] }> }>;
  };
  let copied = 0;

  const bundle = (value: string): string => {
    const rel = copyAsset(path.resolve(value), assetsDir); // "assets/<name>"
    copied++;
    return `${baseUrl}/${path.basename(rel)}`;
  };

  const visit = (entries: unknown[] | undefined): void => {
    for (const entry of entries ?? []) {
      const e = entry as { kind?: string; path?: string; poster?: string; children?: unknown[] };
      if (e.kind === "screenshot" || e.kind === "video" || e.kind === "html") {
        if (typeof e.path === "string" && !isRemote(e.path) && fs.existsSync(e.path)) {
          e.path = bundle(e.path);
        }
        if (typeof e.poster === "string" && !isRemote(e.poster) && fs.existsSync(e.poster)) {
          e.poster = bundle(e.poster);
        }
      }
      if (Array.isArray(e.children)) visit(e.children);
    }
  };

  for (const feature of report.features ?? []) {
    for (const scenario of feature.scenarios ?? []) {
      visit(scenario.docEntries);
    }
  }

  if (copied > 0) {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  }
  return copied;
}

/** Markdown badge line for a what's-changed kind, or undefined for no badge. */
const CHANGE_BADGE: Partial<Record<BehaviorDiff["scenarios"][number]["kind"], string>> = {
  added: "🆕 **New** _since last run_",
  fixed: "✅ **Fixed** _since last run_",
  regressed: "⚠️ **Regressed** _since last run_",
};

/**
 * Build a per-scenario badge lookup from a diff, keyed by `sourceFile\u0000title`
 * (the markdown formatter only knows a test case's file + scenario name, not the
 * StoryReport id). Returns undefined when there's nothing worth badging.
 */
function changeBadgeLookup(
  diff: BehaviorDiff | undefined,
): ((tc: TestCaseResult) => string | undefined) | undefined {
  if (!diff) return undefined;
  const byKey = new Map<string, string>();
  for (const s of diff.scenarios) {
    const badge = CHANGE_BADGE[s.kind];
    if (badge) byKey.set(`${s.sourceFile}\u0000${s.title}`, badge);
  }
  if (byKey.size === 0) return undefined;
  return (tc) => byKey.get(`${tc.sourceFile}\u0000${tc.story.scenario}`);
}

/** Parse a story-report JSON file, returning null if missing or unreadable. */
function readStoryReport(reportPath: string): StoryReport | null {
  if (!fs.existsSync(reportPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(reportPath, "utf8")) as StoryReport;
  } catch {
    return null;
  }
}

/**
 * Read the generated story-report and write `scenario-links.json` beside it.
 * Returns the index (null if the report is missing/unreadable — the index is a
 * convenience, never a reason to fail the build).
 */
export function writeScenarioLinks(
  reportPath: string,
  outDir: string,
  options: { audienceSplit?: boolean } = {},
): ScenarioLinksIndex | null {
  const report = readStoryReport(reportPath);
  if (!report) return null;
  const index = buildScenarioLinks(report, { audienceSplit: options.audienceSplit });
  fs.writeFileSync(
    path.join(outDir, "scenario-links.json"),
    JSON.stringify(index, null, 2),
    "utf8",
  );
  return index;
}

/** Remove generated story pages (.md/.mdx) under a dir, keeping .gitkeep and dirs. */
function clearGeneratedPages(dir: string): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      clearGeneratedPages(full);
      if (fs.readdirSync(full).length === 0) fs.rmdirSync(full);
    } else if (/\.mdx?$/.test(entry.name)) {
      fs.rmSync(full);
    }
  }
}

/** Load a raw run and canonicalize it, mapping failures to typed errors. */
function loadCanonicalRun(rawRunPath: string, synthesize: boolean): TestRunResult {
  try {
    const data = JSON.parse(fs.readFileSync(path.resolve(rawRunPath), "utf8")) as Record<string, unknown>;
    if (data.schemaVersion !== 1) {
      throw new BuildDocsError(`Unsupported schemaVersion ${data.schemaVersion}. Supported: 1.`, "schema");
    }
    const schemaResult = validateRawRun(data);
    if (!schemaResult.valid) {
      throw new BuildDocsError(
        `Schema validation failed:\n${schemaResult.errors.map((e) => `  ${e}`).join("\n")}`,
        "schema",
      );
    }
    let raw = data as unknown as RawRun;
    if (synthesize) raw = synthesizeStories(raw);
    const canonical = canonicalizeRun(raw);
    assertValidRun(canonical);
    return canonical;
  } catch (err) {
    if (err instanceof BuildDocsError) throw err;
    throw new BuildDocsError(`Could not read raw run "${rawRunPath}": ${(err as Error).message}`, "input");
  }
}

export async function buildDocs(options: BuildDocsOptions): Promise<BuildDocsResult> {
  const siteDir = path.resolve(options.siteDir);
  const storiesPublicDir = path.join(siteDir, "public", "stories");
  const assetsDir = path.join(storiesPublicDir, "assets");
  const storyPagesDir = path.join(siteDir, "src", "content", "docs", "stories");
  const apiDir = path.join(siteDir, "src", "content", "docs", "api");
  const reportPath = path.join(storiesPublicDir, "story-report.json");

  const canonical = loadCanonicalRun(options.rawRunPath, options.synthesizeStories ?? true);

  try {
    // Explorer data (read by the Scenario Explorer at runtime).
    await new ReportGenerator({
      formats: ["story-report-json"],
      outputDir: storiesPublicDir,
      outputName: "story-report",
    }).generate(canonical);

    // Diff vs a previous run is computed up-front (before pages) so per-scenario
    // "what changed" badges can be baked into the generated pages. A baseline that
    // was asked for but can't be read is a hard error, not a silent "no changes" —
    // otherwise a typo'd or corrupt path produces a green build with stale/empty
    // change data that downstream tooling would read as current truth.
    let diff: BehaviorDiff | undefined;
    if (options.baselinePath) {
      const baselineResolved = path.resolve(options.baselinePath);
      const baseline = readStoryReport(baselineResolved);
      if (!baseline) {
        throw new BuildDocsError(
          `Baseline story-report not found or unreadable: ${baselineResolved}`,
          "input",
        );
      }
      const current = readStoryReport(reportPath);
      if (current) diff = diffStoryReports(baseline, current);
    }
    const scenarioBadge = changeBadgeLookup(diff);

    // Story pages — one browsable page per source file (colocated), so the
    // docs nav mirrors the test suite instead of one giant aggregated dump.
    // Clear previously-generated pages first so a renamed/removed test doesn't
    // leave a stale page behind.
    clearGeneratedPages(storyPagesDir);

    const genPages = (run: TestRunResult, outDir: string): Promise<unknown> =>
      new ReportGenerator({
        formats: ["astro"],
        outputDir: outDir,
        outputName: "index",
        output: { mode: "colocated", colocatedStyle: "flat" },
        assetMode: "copy",
        astro: {
          assetsDir,
          assetsBaseUrl: "/stories/assets",
          markdown: {
            // Emit the same anchor scenario-links.json points at, so fragments resolve.
            scenarioAnchor: (tc) => scenarioAnchor(tc.story.scenario),
            scenarioBadge,
          },
        },
      }).generate(run);

    const audiences: Record<ReviewAudience, number> = { engineer: 0, stakeholder: 0 };

    if (options.audienceSplit ?? false) {
      // One subdir per audience → the `autogenerate: { directory: 'stories' }`
      // sidebar nests Engineer / Stakeholder groups for free.
      const partitioned = partitionByAudience(canonical);
      for (const audience of AUDIENCES) {
        const sub = partitioned[audience];
        audiences[audience] = sub.testCases.length;
        if (sub.testCases.length === 0) continue;
        await genPages(sub, path.join(storyPagesDir, audience));
      }
    } else {
      await genPages(canonical, storyPagesDir);
    }

    const bundledAssets = bundleExplorerAssets(reportPath, assetsDir);

    // Deep-link index — the stable contract external tools (Linear/Confluence/MCP)
    // resolve against. Built from the report on disk so its scenario ids match the
    // Explorer's exactly.
    const linksIndex = writeScenarioLinks(reportPath, storiesPublicDir, {
      audienceSplit: options.audienceSplit ?? false,
    });
    const scenarioLinks = linksIndex ? Object.keys(linksIndex.scenarios).length : 0;

    // Stories overview — the audience-first landing at `/stories/` (cards with
    // pass/fail counts + deep-linked scenario lists), built from the link index.
    if (linksIndex) {
      fs.writeFileSync(
        path.join(storyPagesDir, "index.md"),
        renderOverviewPage(linksIndex),
        "utf8",
      );
    }

    // What's-changed — scenario-level diff vs a previous run, so the portal shows
    // what moved since last publish rather than just a static snapshot.
    //
    // When no diff is produced this run (no baseline given), remove any change
    // artifacts a *previous* run left behind — otherwise a stale changes.json/.md
    // lingers and reads as current truth. (changes.md also lives under
    // storyPagesDir, which clearGeneratedPages already wipes; removing it here too
    // keeps the contract explicit regardless of layout.)
    const changesJsonPath = path.join(storiesPublicDir, "changes.json");
    const changesMdPath = path.join(storyPagesDir, "changes.md");
    let changes: BehaviorDiff["summary"] | undefined;
    if (diff && linksIndex) {
      fs.writeFileSync(changesJsonPath, JSON.stringify(diff, null, 2), "utf8");
      fs.writeFileSync(changesMdPath, renderChangesPage(diff, linksIndex), "utf8");
      changes = diff.summary;
    } else {
      fs.rmSync(changesJsonPath, { force: true });
      fs.rmSync(changesMdPath, { force: true });
    }

    let apiPages = 0;
    if (options.openapiPath) {
      const res = await importOpenApi({
        specPath: path.resolve(options.openapiPath),
        outputDir: apiDir,
        runFile: reportPath,
        force: true,
      });
      apiPages = res.pageCount;
    }

    return { siteDir, bundledAssets, apiPages, audiences, scenarioLinks, changes };
  } catch (err) {
    if (err instanceof BuildDocsError) throw err;
    throw new BuildDocsError(`Generation failed: ${(err as Error).message}`, "generation");
  }
}
