/**
 * Scenario deep-link index — the contract external tools (Linear, Confluence,
 * the MCP server) resolve against to link straight to "how this works."
 *
 * For each scenario in a StoryReport it computes a stable page URL and in-page
 * anchor, keyed by the durable scenario id. The id never changes across runs, so
 * a link saved today still resolves after the site is regenerated. URLs mirror
 * the audience-split layout produced by `build-docs` (`/stories/<audience>/<stem>/`).
 *
 * The anchor is derived from the scenario *title* via the same `slugify` the rest
 * of the pipeline uses, so the fragment matches the anchor `build-docs` emits into
 * the generated page (see the `scenarioAnchor` markdown option). Title-slug, not
 * the internal id, because the id encodes the source path and reads poorly in a URL
 * bar; the id remains the map key for lookups.
 */

import { slugify } from "./converters/acl/ids";
import { deriveAudience } from "./review/conventions";
import { cleanTestStem } from "./utils/source-file";
import type { ReviewAudience } from "./types/review";
import type { StoryReport, TestStatus } from "./types/story-report";

export interface ScenarioLink {
  id: string;
  title: string;
  audience: ReviewAudience;
  status: TestStatus;
  /** Project-root-relative source file the scenario was defined in. */
  sourceFile: string;
  /** Page URL the scenario lives on (no fragment). */
  url: string;
  /** In-page fragment id; matches the anchor emitted into the generated page. */
  anchor: string;
  /** Full deep link: `url#anchor`. The value external tools should store. */
  deepLink: string;
}

export interface ScenarioLinksIndex {
  schemaVersion: "1.0";
  runId: string;
  /** Root the site serves story pages under (e.g. "/stories"). */
  baseUrl: string;
  /** Keyed by scenario id — the stable, run-independent key. */
  scenarios: Record<string, ScenarioLink>;
}

export interface BuildScenarioLinksOptions {
  /**
   * Mirror the audience-split page layout (`/stories/<audience>/<file>/`).
   * Default false — matches `build-docs` / the CLI, whose default layout is flat
   * (`/stories/<file>/`). Pass true only when pages were generated with the split.
   */
  audienceSplit?: boolean;
  /** Root the site serves story pages under (default "/stories"). */
  baseUrl?: string;
}

/** Deterministic in-page anchor for a scenario, from its title. */
export function scenarioAnchor(title: string): string {
  return `scenario-${slugify(title)}`;
}

/** Build the scenario deep-link index from a StoryReport. */
export function buildScenarioLinks(
  report: StoryReport,
  options: BuildScenarioLinksOptions = {},
): ScenarioLinksIndex {
  const audienceSplit = options.audienceSplit ?? false;
  const baseUrl = (options.baseUrl ?? "/stories").replace(/\/$/, "");
  const scenarios: Record<string, ScenarioLink> = {};

  for (const feature of report.features) {
    // Astro derives the route segment by slugifying the page filename (which is
    // `cleanTestStem` + ".md"), e.g. `auth.int.md` → `/…/authint/`. Slugify the
    // stem the same way so deep-link URLs match the routes Astro actually serves.
    const stem = slugify(cleanTestStem(feature.sourceFile));
    for (const scenario of feature.scenarios) {
      const audience = deriveAudience(feature.sourceFile, scenario.tags);
      const url = audienceSplit
        ? `${baseUrl}/${audience}/${stem}/`
        : `${baseUrl}/${stem}/`;
      const anchor = scenarioAnchor(scenario.title);
      scenarios[scenario.id] = {
        id: scenario.id,
        title: scenario.title,
        audience,
        status: scenario.status,
        sourceFile: feature.sourceFile,
        url,
        anchor,
        deepLink: `${url}#${anchor}`,
      };
    }
  }

  return { schemaVersion: "1.0", runId: report.runId, baseUrl, scenarios };
}
