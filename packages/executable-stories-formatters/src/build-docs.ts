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
import type { RawRun } from "./types/raw";
import type { TestRunResult } from "./types/test-result";

export interface BuildDocsOptions {
  /** Raw run (schemaVersion 1) produced by a framework's StoryReporter. */
  rawRunPath: string;
  /** Root of the scaffolded Astro site (from `init-astro`). */
  siteDir: string;
  /** Optional OpenAPI spec — generates API coverage pages when given. */
  openapiPath?: string;
  /** Synthesize missing story metadata (default true). */
  synthesizeStories?: boolean;
}

export interface BuildDocsResult {
  siteDir: string;
  bundledAssets: number;
  apiPages: number;
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
      if (e.kind === "screenshot" || e.kind === "video") {
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

    // Story pages — one browsable page per source file (colocated), so the
    // docs nav mirrors the test suite instead of one giant aggregated dump.
    // Clear previously-generated pages first so a renamed/removed test doesn't
    // leave a stale page behind.
    clearGeneratedPages(storyPagesDir);
    await new ReportGenerator({
      formats: ["astro"],
      outputDir: storyPagesDir,
      outputName: "index",
      output: { mode: "colocated", colocatedStyle: "flat" },
      assetMode: "copy",
      astro: { assetsDir, assetsBaseUrl: "/stories/assets" },
    }).generate(canonical);

    const bundledAssets = bundleExplorerAssets(reportPath, assetsDir);

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

    return { siteDir, bundledAssets, apiPages };
  } catch (err) {
    if (err instanceof BuildDocsError) throw err;
    throw new BuildDocsError(`Generation failed: ${(err as Error).message}`, "generation");
  }
}
